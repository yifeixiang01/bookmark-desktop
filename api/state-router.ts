import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { findStateByUser, mutateState } from "./queries/user-states";
import type { AppState } from '../src/types/bookmark';

const MAX_STATE_BYTES = 2 * 1024 * 1024; // 2MB 上限，足够数千个书签

/** 轻量结构校验：字段细节由前端 parseStateJSON 在读取侧兜底 */
function isValidState(s: unknown): s is Record<string, unknown> {
  if (typeof s !== "object" || s === null) return false;
  const o = s as Record<string, unknown>;
  return (
    o.version === 1 &&
    Array.isArray(o.partitions) &&
    o.partitions.length > 0 &&
    o.partitions.length <= 50 &&
    typeof o.activePartitionId === "string"
  );
}

export const stateRouter = createRouter({
  snapshot: authedQuery.query(async ({ ctx }) => {
    const row = await findStateByUser(ctx.user.id);
    return { state: row?.state ?? null, revision: row?.revision ?? 0 };
  }),
  /** 读取当前用户的云端桌面状态；从未同步过返回 null */
  get: authedQuery.query(async ({ ctx }) => {
    const row = await findStateByUser(ctx.user.id);
    return row?.state ?? null;
  }),

  /** 整包覆盖保存 */
  save: authedQuery
    .input(z.object({ state: z.unknown(), expectedRevision: z.number().int().min(0).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!isValidState(input.state)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "无效的书签数据" });
      }
      if (JSON.stringify(input.state).length > MAX_STATE_BYTES) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "书签数据过大" });
      }
      const saved = await mutateState(ctx.user.id, (_state, revision, exists) => {
        if ((exists && input.expectedRevision === undefined) || (input.expectedRevision !== undefined && revision !== input.expectedRevision)) {
          throw new TRPCError({ code: 'CONFLICT', message: '云端书签已更新，请刷新获取最新数据后重试' });
        }
        return { state: input.state as AppState, result: null };
      });
      return { ok: true, revision: saved.revision };
    }),
});
