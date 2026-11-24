import { sql } from 'drizzle-orm'
import { getDb } from './connection'

/** Run before accepting requests, including when deploying the bundled Docker image. */
export async function upgradeSchema() {
  await getDb().transaction(async (tx) => {
    // Serialize concurrent replicas during a rolling deployment.
    await tx.execute(sql`select pg_advisory_xact_lock(17611, 0)`)
    await tx.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled integer NOT NULL DEFAULT 0`)
    await tx.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "sessionVersion" integer NOT NULL DEFAULT 0`)
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id serial PRIMARY KEY, "actorId" integer NOT NULL, "targetId" integer NOT NULL,
      action varchar(64) NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now()
    )`)
    await tx.execute(sql`ALTER TABLE user_states ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0`)
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS extension_codes (
      "codeHash" varchar(64) PRIMARY KEY,
      "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge varchar(43) NOT NULL,
      "redirectUri" text NOT NULL,
      "expiresAt" timestamptz NOT NULL
    )`)
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS extension_sessions (
      "tokenHash" varchar(64) PRIMARY KEY,
      "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "expiresAt" timestamptz NOT NULL
    )`)
  })
}
