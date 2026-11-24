import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import {
  users,
  userStates,
  extensionSessions,
  extensionCodes,
  adminAuditLogs,
} from "@db/schema";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { summarizeState } from "./lib/admin-stats";
import { hashPassword, verifyPassword } from "./lib/password";

const safeUser = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  disabled: users.disabled,
  createdAt: users.createdAt,
  lastSignInAt: users.lastSignInAt,
};
const idInput = z.object({ id: z.number().int().positive() });
export const adminRouter = createRouter({
  profile: adminQuery.query(async ({ ctx }) => {
    const [user] = await getDb()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id));
    if (!user)
      throw new TRPCError({ code: "NOT_FOUND", message: "管理员账号不存在" });
    return user;
  }),
  changePassword: adminQuery
    .input(
      z.object({
        currentPassword: z.string().min(1).max(72),
        newPassword: z.string().min(8, "密码至少 8 位").max(72),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.currentPassword === input.newPassword)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "新密码不能与当前密码相同",
        });
      await getDb().transaction(async tx => {
        const [actor] = await tx
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .for("update");
        if (!actor || actor.disabled || actor.role !== "admin" || actor.sessionVersion !== ctx.user.sessionVersion) throw new TRPCError({ code: "UNAUTHORIZED", message: "登录已失效，请重新登录" });
        if (
          !actor.passwordHash ||
          !verifyPassword(input.currentPassword, actor.passwordHash)
        )
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "当前密码不正确",
          });
        await tx
          .update(users)
          .set({
            passwordHash: hashPassword(input.newPassword),
            sessionVersion: sql`${users.sessionVersion} + 1`,
          })
          .where(eq(users.id, ctx.user.id));
        await tx
          .delete(extensionSessions)
          .where(eq(extensionSessions.userId, ctx.user.id));
        await tx
          .delete(extensionCodes)
          .where(eq(extensionCodes.userId, ctx.user.id));
        await tx
          .insert(adminAuditLogs)
          .values({
            actorId: ctx.user.id,
            targetId: ctx.user.id,
            action: "change_password",
          });
      });
      return { ok: true };
    }),
  overview: adminQuery.query(async () => {
    const db = getDb();
    const [totals, recent, disabled, synced, sessions] = await Promise.all([
      db.select({ value: count() }).from(users),
      db
        .select({ value: count() })
        .from(users)
        .where(gt(users.createdAt, new Date(Date.now() - 7 * 86400000))),
      db.select({ value: count() }).from(users).where(eq(users.disabled, 1)),
      db
        .select({
          value: count(),
          bookmarks: sql<number>`coalesce(sum(jsonb_array_length(jsonb_path_query_array(${userStates.state}, '$.partitions[*].items[*] ? (@.kind == "bookmark").bookmark')) + jsonb_array_length(jsonb_path_query_array(${userStates.state}, '$.partitions[*].items[*] ? (@.kind == "group").group.bookmarks[*]'))),0)::float8`,
          bytes: sql<number>`coalesce(sum(octet_length(${userStates.state}::text)),0)::float8`,
        })
        .from(userStates),
      db
        .select({ value: count() })
        .from(extensionSessions)
        .where(gt(extensionSessions.expiresAt, new Date())),
    ]);
    return {
      users: totals[0].value,
      newUsers: recent[0].value,
      disabled: disabled[0].value,
      synced: synced[0].value,
      bytes: synced[0].bytes,
      bookmarks: synced[0].bookmarks,
      sessions: sessions[0].value,
      checkedAt: new Date(),
    };
  }),
  users: adminQuery
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        status: z.enum(["all", "active", "disabled"]).default("all"),
        page: z.number().int().min(1).default(1),
      })
    )
    .query(async ({ input }) => {
      const pattern = `%${input.search.replace(/[\\%_]/g, "\\$&")}%`;
      const where = and(
        input.search
          ? or(ilike(users.name, pattern), ilike(users.email, pattern))
          : undefined,
        input.status === "all"
          ? undefined
          : eq(users.disabled, input.status === "disabled" ? 1 : 0)
      );
      const db = getDb();
      const [rows, total] = await Promise.all([
        db
          .select(safeUser)
          .from(users)
          .where(where)
          .orderBy(desc(users.id))
          .limit(20)
          .offset((input.page - 1) * 20),
        db.select({ value: count() }).from(users).where(where),
      ]);
      return { rows, total: total[0].value };
    }),
  user: adminQuery.input(idInput).query(async ({ input }) => {
    const db = getDb();
    const [user] = await db
      .select(safeUser)
      .from(users)
      .where(eq(users.id, input.id));
    if (!user)
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
    const [state] = await db
      .select()
      .from(userStates)
      .where(eq(userStates.userId, input.id));
    const [sessions] = await db
      .select({ value: count() })
      .from(extensionSessions)
      .where(
        and(
          eq(extensionSessions.userId, input.id),
          gt(extensionSessions.expiresAt, new Date())
        )
      );
    return {
      ...user,
      stats: summarizeState(state?.state),
      revision: state?.revision ?? 0,
      syncedAt: state?.updatedAt ?? null,
      sessions: sessions.value,
    };
  }),
  setDisabled: adminQuery
    .input(idInput.extend({ disabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await getDb().transaction(async tx => {
        const [target] = await tx
          .select()
          .from(users)
          .where(eq(users.id, input.id))
          .for("update");
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        if (target.id === ctx.user.id || target.role === "admin")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "不能在此修改管理员账号状态",
          });
        if (Boolean(target.disabled) === input.disabled) return;
        await tx
          .update(users)
          .set({
            disabled: input.disabled ? 1 : 0,
            sessionVersion: sql`${users.sessionVersion} + 1`,
          })
          .where(eq(users.id, input.id));
        await tx
          .delete(extensionSessions)
          .where(eq(extensionSessions.userId, input.id));
        await tx
          .delete(extensionCodes)
          .where(eq(extensionCodes.userId, input.id));
        await tx.insert(adminAuditLogs).values({
          actorId: ctx.user.id,
          targetId: input.id,
          action: input.disabled ? "disable_user" : "enable_user",
        });
      });
      return { ok: true };
    }),
  sessions: adminQuery
    .input(z.object({ page: z.number().int().positive().default(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const where = gt(extensionSessions.expiresAt, new Date());
      const [rows, total] = await Promise.all([
        db
          .select({
            id: extensionSessions.tokenHash,
            userId: users.id,
            name: users.name,
            email: users.email,
            expiresAt: extensionSessions.expiresAt,
          })
          .from(extensionSessions)
          .innerJoin(users, eq(users.id, extensionSessions.userId))
          .where(where)
          .orderBy(
            desc(extensionSessions.expiresAt),
            extensionSessions.tokenHash
          )
          .limit(20)
          .offset((input.page - 1) * 20),
        db.select({ value: count() }).from(extensionSessions).where(where),
      ]);
      return { rows, total: total[0].value };
    }),
  revokeSession: adminQuery
    .input(z.object({ id: z.string().regex(/^[a-f0-9]{64}$/) }))
    .mutation(async ({ ctx, input }) => {
      await getDb().transaction(async tx => {
        const [row] = await tx
          .delete(extensionSessions)
          .where(eq(extensionSessions.tokenHash, input.id))
          .returning({ userId: extensionSessions.userId });
        if (!row)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "授权已撤销或不存在",
          });
        await tx.insert(adminAuditLogs).values({
          actorId: ctx.user.id,
          targetId: row.userId,
          action: "revoke_extension",
        });
      });
      return { ok: true };
    }),
  logs: adminQuery
    .input(z.object({ page: z.number().int().positive().default(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const [rows, total] = await Promise.all([
        db
          .select({
            id: adminAuditLogs.id,
            actorId: adminAuditLogs.actorId,
            actorName: users.name,
            targetId: adminAuditLogs.targetId,
            action: adminAuditLogs.action,
            createdAt: adminAuditLogs.createdAt,
          })
          .from(adminAuditLogs)
          .leftJoin(users, eq(users.id, adminAuditLogs.actorId))
          .orderBy(desc(adminAuditLogs.id))
          .limit(20)
          .offset((input.page - 1) * 20),
        db.select({ value: count() }).from(adminAuditLogs),
      ]);
      return { rows, total: total[0].value };
    }),
  system: adminQuery.query(async () => {
    await getDb().execute(sql`select 1`);
    return {
      database: "connected",
      checkedAt: new Date(),
      node: process.version,
      uptime: Math.floor(process.uptime()),
      version: process.env.APP_VERSION || "mgmt-v1",
    };
  }),
});
