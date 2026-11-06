import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    // Supabase 连接走 IPv4 的 Supavisor 池化代理；事务池模式禁用预编译语句
    const client = postgres(env.databaseUrl, {
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
