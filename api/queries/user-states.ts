import { eq } from "drizzle-orm";
import { userStates } from "@db/schema";
import { getDb } from "./connection";

export async function findStateByUser(userId: number) {
  const rows = await getDb()
    .select()
    .from(userStates)
    .where(eq(userStates.userId, userId))
    .limit(1);
  return rows.at(0);
}

export async function upsertStateByUser(userId: number, state: unknown) {
  await getDb()
    .insert(userStates)
    .values({ userId, state })
    .onConflictDoUpdate({
      target: userStates.userId,
      set: { state, updatedAt: new Date() },
    });
}
