import * as cookie from "cookie";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { env } from "./lib/env";
import { createRouter, publicQuery } from "./middleware";
import { signSessionToken } from "./kimi/session";
import { findUserByUnionId, upsertUser } from "./queries/users";
import type { TrpcContext } from "./context";

/** 邮箱账号的 unionId 命名空间，与 Kimi OAuth 用户隔离 */
const unionIdFor = (email: string) => `email:${email}`;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** 签发与 OAuth 一致的会话 Cookie（JWT，1 年有效期） */
async function issueSession(ctx: TrpcContext, unionId: string) {
  const token = await signSessionToken({ unionId, clientId: env.appId });
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("邮箱格式不正确")
  .max(320);
const passwordSchema = z.string().min(8, "密码至少 8 位").max(72, "密码最长 72 位");

export const emailAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        name: z.string().trim().max(50).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unionId = unionIdFor(input.email);
      const existing = await findUserByUnionId(unionId);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该邮箱已注册，请直接登录",
        });
      }
      await upsertUser({
        unionId,
        email: input.email,
        name: input.name || input.email.split("@")[0],
        passwordHash: hashPassword(input.password),
        lastSignInAt: new Date(),
      });
      await issueSession(ctx, unionId);
      return { ok: true };
    }),

  login: publicQuery
    .input(z.object({ email: emailSchema, password: z.string().max(72) }))
    .mutation(async ({ ctx, input }) => {
      const unionId = unionIdFor(input.email);
      const user = await findUserByUnionId(unionId);
      if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "邮箱或密码不正确",
        });
      }
      await upsertUser({ unionId });
      await issueSession(ctx, unionId);
      return { ok: true };
    }),
});
