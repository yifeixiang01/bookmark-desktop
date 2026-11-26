import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { articles } from '@db/schema'
import { getDb } from './queries/connection'
import { createRouter, authedQuery } from './middleware'
import { normalizeArticleUrl } from '../src/lib/articles'

const fields = {
  title: z.string().trim().min(1).max(300),
  description: z.string().max(2000),
  cover: z.string().max(2048).refine(v => !v || /^https?:\/\//i.test(v)),
  note: z.string().max(5000),
  tags: z.array(z.string().trim().min(1).max(30)).max(12),
  read: z.boolean(),
  starred: z.boolean(),
}

export const articleRouter = createRouter({
  list: authedQuery.query(({ ctx }) => getDb().select().from(articles).where(eq(articles.userId, ctx.user.id)).orderBy(desc(articles.createdAt))),
  save: authedQuery.input(z.object({
    ...fields,
    id: z.string().uuid().optional(),
    url: z.string().trim().min(1).max(2048).transform((value, ctx) => {
      try { return normalizeArticleUrl(value) } catch { ctx.addIssue({ code: 'custom', message: '请输入有效的文章链接' }); return z.NEVER }
    }),
    createdAt: z.coerce.date().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb()
    const { id, createdAt, ...values } = input
    const duplicate = await db.select({ id: articles.id }).from(articles).where(and(eq(articles.userId, ctx.user.id), eq(articles.url, values.url))).limit(1)
    if (duplicate[0] && duplicate[0].id !== id) throw new TRPCError({ code: 'CONFLICT', message: '这篇文章已经收藏过了' })
    if (id) {
      // An absent id can only be restored as a new row; never update another user's row.
      const existing = await db.select({ userId: articles.userId }).from(articles).where(eq(articles.id, id)).limit(1)
      if (existing[0] && existing[0].userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' })
      if (existing[0]) {
        await db.update(articles).set({ ...values, updatedAt: new Date() }).where(and(eq(articles.id, id), eq(articles.userId, ctx.user.id)))
        return { id }
      }
    }
    const nextId = id ?? randomUUID()
    const inserted = await db.insert(articles).values({ ...values, id: nextId, userId: ctx.user.id, createdAt }).onConflictDoNothing().returning({ id: articles.id })
    if (!inserted.length) throw new TRPCError({ code: 'CONFLICT', message: '这篇文章已经收藏过了' })
    return { id: nextId }
  }),
  update: authedQuery.input(z.object({ ids: z.array(z.string().uuid()).min(1).max(100), read: z.boolean().optional(), starred: z.boolean().optional(), tags: fields.tags.optional() }))
    .mutation(async ({ ctx, input }) => {
      const { ids, ...patch } = input
      await getDb().update(articles).set({ ...patch, updatedAt: new Date() }).where(and(eq(articles.userId, ctx.user.id), inArray(articles.id, ids)))
      return { ok: true }
    }),
  delete: authedQuery.input(z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await getDb().delete(articles).where(and(eq(articles.userId, ctx.user.id), inArray(articles.id, input.ids)))
      return { ok: true }
    }),
})
