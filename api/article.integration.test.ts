import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomBytes } from 'node:crypto'
import * as schema from '../db/schema'

let database: ReturnType<typeof drizzle<typeof schema>>
vi.mock('./queries/connection', () => ({ getDb: () => database }))
import { articleRouter } from './article-router'
import { upgradeSchema } from './queries/upgrade-schema'

const url = process.env.TEST_DATABASE_URL
;(url ? describe : describe.skip)('article collection (isolated PostgreSQL schema)', () => {
  const name = `article_test_${randomBytes(8).toString('hex')}`
  let admin: ReturnType<typeof postgres>, client: ReturnType<typeof postgres>
  let owner: ReturnType<typeof articleRouter.createCaller>, other: typeof owner
  const values = { url: 'https://example.com/article?utm_source=test#heading', title: 'Article', description: '', cover: '', note: 'remember', tags: ['技术'], read: false, starred: false }
  beforeAll(async () => {
    admin = postgres(url!, { prepare: false })
    await admin.unsafe(`CREATE SCHEMA "${name}"`)
    client = postgres(url!, { prepare: false, connection: { search_path: name } })
    database = drizzle(client, { schema })
    await client.unsafe('CREATE TABLE users (id serial PRIMARY KEY, "unionId" varchar(255) NOT NULL UNIQUE, name varchar(255), email varchar(320), avatar text, "passwordHash" varchar(255), role varchar(16) NOT NULL DEFAULT \'user\', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "lastSignInAt" timestamptz NOT NULL DEFAULT now()); CREATE TABLE user_states (id serial PRIMARY KEY, "userId" integer NOT NULL UNIQUE, state jsonb NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now());')
    await client.unsafe(`INSERT INTO users ("unionId") VALUES ('owner'), ('other'); INSERT INTO user_states ("userId", state) VALUES (1, '{"preserved":true}');`)
    await upgradeSchema()
    await upgradeSchema()
    const users = await database.select().from(schema.users)
    const context = (user: typeof users[number]) => ({ user, req: new Request('http://localhost'), resHeaders: new Headers() })
    owner = articleRouter.createCaller(context(users[0]))
    other = articleRouter.createCaller(context(users[1]))
  })
  afterAll(async () => {
    if (client) await client.end()
    if (admin) { await admin.unsafe(`DROP SCHEMA IF EXISTS "${name}" CASCADE`); await admin.end() }
  })
  it('normalizes duplicates, keeps meaningful query strings, and rejects executable URLs', async () => {
    await owner.save(values)
    expect((await owner.list())[0]).toMatchObject({ url: 'https://example.com/article', tags: ['技术'], note: 'remember' })
    await expect(owner.save({ ...values, url: 'https://example.com/article?utm_medium=other' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(owner.save({ ...values, url: 'javascript:alert(1)' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(owner.save({ ...values, url: 'ftp://example.com/file' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await owner.save({ ...values, url: 'https://example.com/article?page=2' })
    expect(await owner.list()).toHaveLength(2)
  })
  it('isolates users for list, update, save, delete and permits same URL across accounts', async () => {
    const article = (await owner.list())[0]
    expect(await other.list()).toHaveLength(0)
    await other.update({ ids: [article.id], read: true, starred: true })
    await other.delete({ ids: [article.id] })
    await expect(other.save({ ...values, id: article.id })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect((await owner.list()).find(a => a.id === article.id)).toMatchObject({ read: false, starred: false })
    await other.save(values)
    expect(await other.list()).toHaveLength(1)
    const anonymous = articleRouter.createCaller({ user: undefined, req: new Request('http://localhost'), resHeaders: new Headers() })
    await expect(anonymous.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('supports bulk changes, deletion and restoration without touching desktop data', async () => {
    const articles = await owner.list()
    await owner.update({ ids: articles.map(a => a.id), read: true, tags: ['归档'] })
    expect((await owner.list()).every(a => a.read && a.tags.includes('归档'))).toBe(true)
    const saved = (await owner.list())[0]
    await owner.delete({ ids: [saved.id] })
    expect(await owner.list()).toHaveLength(1)
    await owner.save(saved)
    expect((await owner.list()).find(a => a.id === saved.id)).toMatchObject({ title: saved.title, read: true, createdAt: saved.createdAt })
    expect((await database.select().from(schema.userStates))[0].state).toEqual({ preserved: true })
  })
})
