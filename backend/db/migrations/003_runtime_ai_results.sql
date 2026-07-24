BEGIN;
CREATE TABLE IF NOT EXISTS catering_ai_results (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES commerce_tenants(id) ON DELETE RESTRICT,
  actor_subject TEXT NOT NULL,
  feature TEXT NOT NULL,
  input JSONB NOT NULL,
  output TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS catering_ai_results_tenant_idx ON catering_ai_results(tenant_id, created_at DESC);
COMMIT;
