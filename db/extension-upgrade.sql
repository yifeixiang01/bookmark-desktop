-- Dandan 0.1.0 upgrade (PostgreSQL). Run before starting the new server.
-- Additive migration: existing user data is retained.
BEGIN;
ALTER TABLE user_states ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS extension_codes (
  "codeHash" varchar(64) PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge varchar(43) NOT NULL,
  "redirectUri" text NOT NULL,
  "expiresAt" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS extension_sessions (
  "tokenHash" varchar(64) PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL
);
COMMIT;
