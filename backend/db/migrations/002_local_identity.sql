BEGIN;
ALTER TABLE commerce_identities ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE commerce_identities ADD COLUMN IF NOT EXISTS display_name TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_identity_email_idx ON commerce_identities(LOWER(email)) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS commerce_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  tenant_id UUID NOT NULL,
  subject TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(tenant_id,subject) REFERENCES commerce_identities(tenant_id,subject) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS commerce_sessions_expiry_idx ON commerce_sessions(expires_at);
COMMIT;
