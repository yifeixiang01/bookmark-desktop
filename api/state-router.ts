import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { findStateByUser, upsertStateByUser } from "./queries/user-states";

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
  /** 读取当前用户的云端桌面状态；从未同步过返回 null */
  get: authedQuery.query(async ({ ctx }) => {
    const row = await findStateByUser(ctx.user.id);
    return row?.state ?? null;
  }),

  /** 整包覆盖保存 */
  save: authedQuery
    .input(z.object({ state: z.unknown() }))
    .mutation(async ({ ctx, input }) => {
      if (!isValidState(input.state)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "无效的书签数据" });
      }
      if (JSON.stringify(input.state).length > MAX_STATE_BYTES) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "书签数据过大" });
      }
      await upsertStateByUser(ctx.user.id, input.state);
      return { ok: true };
    }),
});
