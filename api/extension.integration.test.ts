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
})
