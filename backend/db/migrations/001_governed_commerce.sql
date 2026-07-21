BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS commerce_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_identities (
  tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), subject text NOT NULL,
  role text NOT NULL CHECK(role IN ('customer','operator','merchant')), email text, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,subject)
);
CREATE TABLE IF NOT EXISTS commerce_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), merchant_subject text NOT NULL,
  sku text NOT NULL, name text NOT NULL, available_quantity integer NOT NULL CHECK(available_quantity >= 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0), unit_price_cents integer NOT NULL CHECK(unit_price_cents >= 0),
  version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,merchant_subject,sku)
);
CREATE TABLE IF NOT EXISTS commerce_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), order_number text NOT NULL,
  customer_subject text NOT NULL, merchant_subject text NOT NULL, state text NOT NULL DEFAULT 'TAX_PENDING', currency char(3) NOT NULL DEFAULT 'USD',
  subtotal_cents integer NOT NULL CHECK(subtotal_cents >= 0), tax_cents integer, total_cents integer,
  idempotency_key text NOT NULL, version integer NOT NULL DEFAULT 1, exception_code text,
  recovery_state text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,order_number), UNIQUE(tenant_id,customer_subject,idempotency_key)
);
CREATE TABLE IF NOT EXISTS commerce_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES commerce_orders(id), inventory_id uuid NOT NULL REFERENCES commerce_inventory(id),
  quantity integer NOT NULL CHECK(quantity > 0), fulfilled_quantity integer NOT NULL DEFAULT 0 CHECK(fulfilled_quantity >= 0),
  unit_price_cents integer NOT NULL CHECK(unit_price_cents >= 0), CHECK(fulfilled_quantity <= quantity)
);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS recovery_state text;
CREATE TABLE IF NOT EXISTS commerce_provider_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), order_id uuid REFERENCES commerce_orders(id),
  provider text NOT NULL CHECK(provider IN ('tax','payment','delivery')), operation text NOT NULL, idempotency_key text NOT NULL,
  request_payload jsonb NOT NULL, response_payload jsonb, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','retryable','dead-letter')),
  attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(), last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,provider,idempotency_key)
);
CREATE TABLE IF NOT EXISTS commerce_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), order_id uuid NOT NULL REFERENCES commerce_orders(id),
  amount_cents integer NOT NULL CHECK(amount_cents > 0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','succeeded','failed')),
  request_key text NOT NULL, provider_reference text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,request_key)
);
CREATE TABLE IF NOT EXISTS commerce_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), order_id uuid NOT NULL REFERENCES commerce_orders(id),
  line_id uuid NOT NULL REFERENCES commerce_order_lines(id), quantity integer NOT NULL CHECK(quantity > 0), idempotency_key text NOT NULL,
  created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS commerce_webhook_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), provider text NOT NULL,
  delivery_id text NOT NULL, body_sha256 text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,provider,delivery_id)
);
CREATE TABLE IF NOT EXISTS commerce_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), provider text NOT NULL,
  status text NOT NULL CHECK(status IN ('running','passed','exceptions','failed')), exception_count integer NOT NULL DEFAULT 0,
  started_by text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS commerce_reconciliation_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES commerce_reconciliation_runs(id), order_id uuid REFERENCES commerce_orders(id),
  exception_type text NOT NULL, details jsonb NOT NULL, resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS commerce_audit_events (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES commerce_tenants(id), actor_subject text NOT NULL,
  action text NOT NULL, order_id uuid REFERENCES commerce_orders(id), from_state text, to_state text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION reject_commerce_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'commerce audit is append-only'; END; $$;
DROP TRIGGER IF EXISTS commerce_audit_immutable ON commerce_audit_events;
CREATE TRIGGER commerce_audit_immutable BEFORE UPDATE OR DELETE ON commerce_audit_events FOR EACH ROW EXECUTE FUNCTION reject_commerce_audit_mutation();
CREATE INDEX IF NOT EXISTS commerce_orders_actor_idx ON commerce_orders(tenant_id,customer_subject,merchant_subject,created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_jobs_due_idx ON commerce_provider_jobs(status,next_attempt_at);
CREATE INDEX IF NOT EXISTS commerce_audit_tenant_idx ON commerce_audit_events(tenant_id,occurred_at DESC);
COMMIT;
