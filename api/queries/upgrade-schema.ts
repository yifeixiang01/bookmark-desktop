import { sql } from 'drizzle-orm'
import { getDb } from './connection'

/** Run before accepting requests, including when deploying the bundled Docker image. */
export async function upgradeSchema() {
  await getDb().transaction(async (tx) => {
    // Serialize concurrent replicas during a rolling deployment.
    await tx.execute(sql`select pg_advisory_xact_lock(17611, 0)`)
    await tx.execute(sql`ALTER TABLE user_states ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0`)
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS articles (
      id varchar(36) PRIMARY KEY,
      "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url text NOT NULL,
      title varchar(300) NOT NULL,
      description text NOT NULL DEFAULT '',
      cover text NOT NULL DEFAULT '',
      note text NOT NULL DEFAULT '',
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      read boolean NOT NULL DEFAULT false,
      starred boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`)
    await tx.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS articles_user_url_unique ON articles ("userId", url)`)
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
