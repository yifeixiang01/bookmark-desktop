import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { userStates } from '@db/schema';
import { getDb } from './connection';
import { defaultState } from '../lib/extension-state';
import type { AppState } from '../../src/types/bookmark';

export async function findStateByUser(userId: number) {
  const rows = await getDb().select().from(userStates).where(eq(userStates.userId, userId)).limit(1);
  return rows.at(0);
}
export async function mutateState<T>(userId: number, fn: (state: AppState, revision: number, exists: boolean) => { state: AppState; result: T }) {
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(17611, ${userId})`);
    const [row] = await tx.select().from(userStates).where(eq(userStates.userId, userId));
    const revision = row?.revision ?? 0;
    const next = fn((row?.state as AppState | undefined) ?? defaultState(), revision, !!row);
    if (Buffer.byteLength(JSON.stringify(next.state), 'utf8') > 2 * 1024 * 1024) throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: '书签数据过大' });
    await tx.insert(userStates).values({ userId, state: next.state, revision: revision + 1 }).onConflictDoUpdate({ target: userStates.userId, set: { state: next.state, revision: revision + 1, updatedAt: new Date() } });
    return { result: next.result, revision: revision + 1 };
  });
}
export async function ensureState(userId: number) {
  if (!(await findStateByUser(userId))) await mutateState(userId, state => ({ state, result: null }));
  return (await findStateByUser(userId))!;
}
