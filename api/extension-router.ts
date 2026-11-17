import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { extensionCodes, extensionSessions, users } from '@db/schema';
import { getDb } from './queries/connection';
import { authenticateRequest } from './kimi/auth';
import { ensureState, mutateState } from './queries/user-states';
import { addToSpaces, canonicalUrl } from './lib/extension-state';

const app = new Hono();
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const site = new URL(process.env.PUBLIC_APP_URL || 'https://bookmark.yifeixiang.com.cn');
const redirectSchema = z.string().url().refine(v => {
  const url = new URL(v);
  return url.protocol === 'https:' && /^[a-p]{32}\.chromiumapp\.org$/.test(url.hostname) && url.pathname === '/dandan' && !url.search && !url.hash && !url.username && !url.password && !url.port;
});
const authorization = z.object({ redirectUri: redirectSchema, state: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/), challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
const webUrl = z.string().max(8192).url().refine(v => { try { canonicalUrl(v); return true; } catch { return false; } });
const bookmarkInput = z.object({ title: z.string().trim().min(1).max(300), url: webUrl, icon: webUrl.optional(), description: z.string().max(2000).optional(), spaceIds: z.array(z.string().min(1).max(100)).min(1).max(50) });

app.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
  await next();
});
app.onError((error, c) => {
  console.error('[extension]', error.message);
  return c.json({ error: '服务暂时不可用，请稍后重试' }, 500);
});

// Cookie-authenticated approval must originate at our website, never at another origin.
app.post('/authorize', async c => {
  if (c.req.header('origin') !== site.origin) return c.json({ error: '无效的授权来源' }, 403);
  let user;
  try { user = await authenticateRequest(c.req.raw.headers); } catch { return c.json({ error: '请先登录' }, 401); }
  const parsed = authorization.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: '授权参数无效，请从 Dandan 重新登录' }, 400);
  const { redirectUri, challenge, state } = parsed.data;
  const code = randomBytes(32).toString('base64url');
  await getDb().delete(extensionCodes).where(lt(extensionCodes.expiresAt, new Date()));
  await getDb().insert(extensionCodes).values({ codeHash: hash(code), userId: user.id, challenge, redirectUri, expiresAt: new Date(Date.now() + 60_000) });
  const redirect = new URL(redirectUri);
  redirect.searchParams.set('code', code);
  redirect.searchParams.set('state', state);
  return c.json({ redirect: redirect.href });
});

app.post('/token', async c => {
  const parsed = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{43}$/), verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/), redirectUri: redirectSchema }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: '无效的授权凭证' }, 400);
  const { code, verifier, redirectUri } = parsed.data;
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600_000);
  const ok = await getDb().transaction(async tx => {
    const [row] = await tx.delete(extensionCodes).where(and(eq(extensionCodes.codeHash, hash(code)), eq(extensionCodes.challenge, challenge), eq(extensionCodes.redirectUri, redirectUri), gt(extensionCodes.expiresAt, new Date()))).returning();
    if (!row) return false;
    await tx.delete(extensionSessions).where(lt(extensionSessions.expiresAt, new Date()));
    await tx.insert(extensionSessions).values({ tokenHash: hash(token), userId: row.userId, expiresAt });
    return true;
  });
  if (!ok) return c.json({ error: '授权已过期，请重新登录' }, 401);
  return c.json({ token, expiresAt: expiresAt.toISOString() });
});

async function session(req: Request) {
  const token = req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token) return null;
  const [row] = await getDb().select({ userId: extensionSessions.userId, email: users.email, name: users.name }).from(extensionSessions).innerJoin(users, eq(users.id, extensionSessions.userId)).where(and(eq(extensionSessions.tokenHash, hash(token)), gt(extensionSessions.expiresAt, new Date())));
  return row ? { ...row, tokenHash: hash(token) } : null;
}
app.get('/spaces', async c => {
  const user = await session(c.req.raw);
  if (!user) return c.json({ error: '登录已失效，请重新授权' }, 401);
  const row = await ensureState(user.userId);
  const state = row.state as import('../src/types/bookmark').AppState;
  const url = c.req.query('url');
  return c.json({ user: { id: user.userId, name: user.name, email: user.email }, spaces: state.partitions.map(p => ({ id: p.id, name: p.name, saved: !!url && p.items.some(it => (it.kind === 'bookmark' ? [it.bookmark] : it.group.bookmarks).some(b => { try { return canonicalUrl(b.url) === canonicalUrl(url); } catch { return false; } })) })) });
});
app.post('/bookmarks', async c => {
  const user = await session(c.req.raw);
  if (!user) return c.json({ error: '登录已失效，请重新授权' }, 401);
  const parsed = bookmarkInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: '请检查网址、标题和所选空间' }, 400);
  try {
    const saved = await mutateState(user.userId, state => {
      const next = structuredClone(state);
      return { state: next, result: addToSpaces(next, parsed.data) };
    });
    return c.json(saved.result);
  } catch (error) { return c.json({ error: error instanceof Error ? error.message : '保存失败，请重试' }, 400); }
});
app.post('/logout', async c => {
  const user = await session(c.req.raw);
  if (user) await getDb().delete(extensionSessions).where(eq(extensionSessions.tokenHash, user.tokenHash));
  return c.json({ ok: true });
});
export default app;
