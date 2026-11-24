import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomBytes, createHash } from 'node:crypto'
import * as schema from '../db/schema'

vi.hoisted(() => { process.env.APP_SECRET = 'integration-test-only-secret'; process.env.PUBLIC_APP_URL = 'https://bookmark.yifeixiang.com.cn' })
let database: ReturnType<typeof drizzle<typeof schema>>
vi.mock('./queries/connection', () => ({ getDb: () => database }))
import extensionApp from './extension-router'
import { signSessionToken } from './kimi/session'
import { Session } from '../contracts/constants'
import { emailAuthRouter } from './email-auth-router'
import { adminRouter } from './admin-router'
import { authenticateRequest } from './kimi/auth'
import { eq } from 'drizzle-orm'
import { stateRouter } from './state-router'
import { ensureState, findStateByUser } from './queries/user-states'
import { upgradeSchema } from './queries/upgrade-schema'

const url = process.env.TEST_DATABASE_URL
const suite = url ? describe : describe.skip
suite('extension HTTP and state concurrency (isolated PostgreSQL schema)', () => {
  const schemaName = `dandan_test_${randomBytes(8).toString('hex')}`
  let admin: ReturnType<typeof postgres>, client: ReturnType<typeof postgres>
  let cookie: string, user: typeof schema.users.$inferSelect, otherUser: typeof schema.users.$inferSelect
  const redirectUri = `https://${'a'.repeat(32)}.chromiumapp.org/dandan`
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(32).toString('base64url')
  const origin = 'https://bookmark.yifeixiang.com.cn'
  const request = (path: string, body?: unknown, headers?: Record<string, string>) => extensionApp.request(`https://bookmark.yifeixiang.com.cn${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
  beforeAll(async () => {
    admin = postgres(url!, { prepare: false })
    await admin.unsafe(`CREATE SCHEMA "${schemaName}"`)
    client = postgres(url!, { prepare: false, connection: { search_path: schemaName } })
    database = drizzle(client, { schema })
    await client.unsafe('CREATE TABLE users (id serial PRIMARY KEY, "unionId" varchar(255) NOT NULL UNIQUE, name varchar(255), email varchar(320), avatar text, "passwordHash" varchar(255), role varchar(16) NOT NULL DEFAULT \'user\', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "lastSignInAt" timestamptz NOT NULL DEFAULT now()); CREATE TABLE user_states (id serial PRIMARY KEY, "userId" integer NOT NULL UNIQUE, state jsonb NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now());')
    await client.unsafe(`INSERT INTO users ("unionId") VALUES ('migration-preservation-test'); INSERT INTO user_states ("userId", state) VALUES (1, '{"preserved":true}');`)
    await upgradeSchema()
    await upgradeSchema()
    const [preserved] = await client`SELECT state, revision FROM user_states WHERE "userId" = 1`
    expect(preserved).toMatchObject({ state: { preserved: true }, revision: 0 })
    ;[user, otherUser] = await database.insert(schema.users).values([{ unionId: 'email:test@example.com', email: 'test@example.com' }, { unionId: 'email:other@example.com' }]).returning()
    cookie = `${Session.cookieName}=${await signSessionToken({ unionId: user.unionId, clientId: 'bookmark-desktop' })}`
  })
  afterAll(async () => {
    if (client) await client.end()
    if (admin) { await admin.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`); await admin.end() }
  })
  async function authorize() {
    const response = await request('/authorize', { redirectUri, challenge, state }, { cookie, origin })
    expect(response.status).toBe(200)
    return new URL(((await response.json()) as { redirect: string }).redirect).searchParams.get('code')!
  }
  async function token() {
    const code = await authorize()
    const response = await request('/token', { code, verifier, redirectUri })
    expect(response.status).toBe(200)
    return ((await response.json()) as { token: string }).token
  }
  it('requires website login, exact origin and a Chromium callback', async () => {
    expect((await request('/authorize', { redirectUri, challenge, state }, { origin })).status).toBe(401)
    expect((await request('/authorize', { redirectUri, challenge, state }, { cookie, origin: 'https://evil.example' })).status).toBe(403)
    expect((await request('/authorize', { redirectUri: 'https://evil.example/dandan', challenge, state }, { cookie, origin })).status).toBe(400)
    expect((await request('/spaces')).status).toBe(401)
  })
  it('binds single-use codes to PKCE and callback and supports revocation', async () => {
    const code = await authorize()
    expect((await request('/token', { code, verifier: 'x'.repeat(43), redirectUri })).status).toBe(401)
    const good = await request('/token', { code, verifier, redirectUri })
    expect(good.status).toBe(200)
    expect((await request('/token', { code, verifier, redirectUri })).status).toBe(401)
    const access = ((await good.json()) as { token: string }).token
    const headers = { authorization: `Bearer ${access}` }
    expect((await request('/spaces', undefined, headers)).status).toBe(200)
    expect((await request('/logout', {}, headers)).status).toBe(200)
    expect((await request('/spaces', undefined, headers)).status).toBe(401)
  })
  it('atomically saves multiple spaces, skips retry duplicates and rejects unowned spaces', async () => {
    await ensureState(otherUser.id)
    const other = await findStateByUser(otherUser.id)
    const otherState = other!.state as import('../src/types/bookmark').AppState
    const headers = { authorization: `Bearer ${await token()}` }
    const list = await (await request('/spaces', undefined, headers)).json() as { spaces: { id: string }[] }
    const first = list.spaces[0].id
    const { mutateState } = await import('./queries/user-states')
    await mutateState(user.id, state => { state.partitions.push({ id: 'second', name: '工作', items: [] }); return { state, result: null } })
    const body = { title: 'Example', url: 'https://example.com/', spaceIds: [first, 'second'] }
    const results = await Promise.all([request('/bookmarks', body, headers), request('/bookmarks', body, headers)])
    const json = await Promise.all(results.map(async r => await r.json() as { added: string[] }))
    expect(json.map(x => x.added.length).sort()).toEqual([0, 2])
    const before = JSON.stringify((await findStateByUser(user.id))!.state)
    expect((await request('/bookmarks', { ...body, url: 'https://new.example', spaceIds: [first, otherState.partitions[0].id] }, headers)).status).toBe(400)
    expect(JSON.stringify((await findStateByUser(user.id))!.state)).toBe(before)
    expect((await request('/bookmarks', { ...body, url: 'javascript:alert(1)' }, headers)).status).toBe(400)
  })
  it('rejects stale desktop writes and unversioned legacy clients', async () => {
    const caller = stateRouter.createCaller({ user, req: new Request(origin), resHeaders: new Headers() })
    const snapshot = await caller.snapshot()
    const headers = { authorization: `Bearer ${await token()}` }
    const data = snapshot.state as import('../src/types/bookmark').AppState
    await request('/bookmarks', { title: 'New', url: 'https://fresh.example', spaceIds: [data.partitions[0].id] }, headers)
    await expect(caller.save({ state: data, expectedRevision: snapshot.revision })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(caller.save({ state: data })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(JSON.stringify((await findStateByUser(user.id))!.state)).toContain('https://fresh.example/')
  })
  it('protects admin procedures and safely manages accounts and extensions', async () => {
    const context = { req: new Request(origin), resHeaders: new Headers() }
    await expect(adminRouter.createCaller(context).overview()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    const regular = adminRouter.createCaller({ ...context, user })
    await expect(regular.users({})).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(regular.setDisabled({ id: otherUser.id, disabled: true })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const [manager] = await database.insert(schema.users).values({ unionId: 'email:manager@example.com', role: 'admin' }).returning()
    const caller = adminRouter.createCaller({ ...context, user: manager })
    await expect(caller.setDisabled({ id: manager.id, disabled: true })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const overview = await caller.overview()
    expect(overview.users).toBe(4)
    expect(overview.bookmarks).toBeGreaterThan(0)
    expect(await caller.users({ search: 'test@example.com' })).toMatchObject({ total: 1 })
    expect(await caller.users({ search: '%' })).toMatchObject({ total: 0 })
    const detail = await caller.user({ id: user.id })
    expect(detail).not.toHaveProperty('passwordHash')
    expect(detail).not.toHaveProperty('state')
    expect(detail.stats.bookmarks).toBeGreaterThan(0)
    const access = await token()
    const sessions = await caller.sessions({})
    const sessionId = createHash('sha256').update(access).digest('hex')
    expect(sessions.rows.some(row => row.id === sessionId)).toBe(true)
    await caller.revokeSession({ id: sessionId })
    expect((await request('/spaces', undefined, { authorization: `Bearer ${access}` })).status).toBe(401)
    const secondAccess = await token()
    await caller.setDisabled({ id: user.id, disabled: true })
    await expect(authenticateRequest(new Headers({ cookie }))).rejects.toBeDefined()
    expect((await request('/spaces', undefined, { authorization: `Bearer ${secondAccess}` })).status).toBe(401)
    expect(await caller.users({ status: 'disabled' })).toMatchObject({ total: 1 })
    await caller.setDisabled({ id: user.id, disabled: false })
    await expect(authenticateRequest(new Headers({ cookie }))).rejects.toBeDefined()
    const [fresh] = await database.select().from(schema.users).where(eq(schema.users.id, user.id))
    const newCookie = `${Session.cookieName}=${await signSessionToken({ unionId: user.unionId, clientId: 'bookmark-desktop', sessionVersion: fresh.sessionVersion })}`
    expect((await authenticateRequest(new Headers({ cookie: newCookie }))).id).toBe(user.id)
    expect((await caller.logs({})).rows.map(row => row.action)).toEqual(['enable_user', 'disable_user', 'revoke_extension'])
    expect((await caller.system()).database).toBe('connected')
  })
  it('rejects disabled email login and issues current session versions after recovery', async () => {
    const headers = new Headers()
    const input = { email: 'login-lifecycle@example.test', password: 'test-password-only' }
    const emailCaller = emailAuthRouter.createCaller({ req: new Request(origin), resHeaders: headers })
    await emailCaller.register(input)
    const [account] = await database.select().from(schema.users).where(eq(schema.users.email, input.email))
    const [manager] = await database.select().from(schema.users).where(eq(schema.users.role, 'admin'))
    const caller = adminRouter.createCaller({ req: new Request(origin), resHeaders: new Headers(), user: manager })
    await caller.setDisabled({ id: account.id, disabled: true })
    await expect(emailCaller.login(input)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await caller.setDisabled({ id: account.id, disabled: false })
    const loginHeaders = new Headers()
    await emailAuthRouter.createCaller({ req: new Request(origin), resHeaders: loginHeaders }).login(input)
    const loginCookie = loginHeaders.get('set-cookie')!.split(';')[0]
    expect((await authenticateRequest(new Headers({ cookie: loginCookie }))).id).toBe(account.id)
    const registerCookie = headers.get('set-cookie')!.split(';')[0]
    await expect(authenticateRequest(new Headers({ cookie: registerCookie }))).rejects.toBeDefined()
  })
  it('changes administrator password and invalidates old credentials', async () => {
    const context = { req: new Request(origin), resHeaders: new Headers() }
    const credentials = { email: 'password-admin@example.test', password: 'old-password-test' }
    await emailAuthRouter.createCaller(context).register(credentials)
    const [account] = await database.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.email, credentials.email)).returning()
    const caller = adminRouter.createCaller({ ...context, user: account })
    const oldCookie = `${Session.cookieName}=${await signSessionToken({ unionId: account.unionId, clientId: 'bookmark-desktop', sessionVersion: account.sessionVersion })}`
    await database.insert(schema.extensionSessions).values({ tokenHash: 'a'.repeat(64), userId: account.id, expiresAt: new Date(Date.now() + 60000) })
    await expect(caller.changePassword({ currentPassword: 'incorrect', newPassword: 'new-password-test' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    await expect(caller.changePassword({ currentPassword: credentials.password, newPassword: credentials.password })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await caller.changePassword({ currentPassword: credentials.password, newPassword: 'new-password-test' })
    await expect(authenticateRequest(new Headers({ cookie: oldCookie }))).rejects.toBeDefined()
    expect(await database.select().from(schema.extensionSessions).where(eq(schema.extensionSessions.userId, account.id))).toHaveLength(0)
    await expect(emailAuthRouter.createCaller(context).login(credentials)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    await emailAuthRouter.createCaller(context).login({ ...credentials, password: 'new-password-test' })
    expect((await caller.logs({})).rows[0]).toMatchObject({ action: 'change_password', targetId: account.id })
    await expect(caller.changePassword({ currentPassword: 'new-password-test', newPassword: 'another-password-test' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
