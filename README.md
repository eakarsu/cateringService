# Catering Commerce Operations

A governed catering order platform centered on one production journey: authoritative inventory, tax, reservation, payment, partial fulfillment, delivery, cancellation/refund, exception recovery, and settlement reconciliation.

## Implemented controls

- Short-lived RS256 organization sessions with tenant-scoped customer, merchant, and operator roles.
- An explicit order state machine; invalid transitions and stale changes fail with conflicts.
- Atomic, oversell-safe inventory reservation and idempotent partial fulfillment.
- Retry-safe tax, payment, refund, and delivery adapters with durable queues, backoff, dead letters, and provider references.
- Signed, tenant-bound, replay-safe partner webhooks.
- Customer ownership and merchant assignment boundaries, append-only order/refund audit, and reconciliation exceptions.
- A focused production UI for each role. Legacy generated/demo/AI routes and broad scaffold screens are not mounted by the production entrypoint.
- Replay-safe SQL migration, explicit migration opt-in, fail-closed startup, non-root container, CI, unit tests, and real HTTP/PostgreSQL E2E.

## Verify locally

```bash
npm --prefix backend ci
npm --prefix frontend ci
cp .env.example .env
# Replace all placeholders and use a disposable PostgreSQL database.
ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate
./start.sh check
TEST_DATABASE_URL=postgres:///catering_test npm --prefix backend test
npm --prefix frontend run build
./start.sh start
```

The E2E journey applies the migration twice and proves duplicate checkout/webhook handling, role and tenant boundaries, price authority, oversell rollback, payment failure/retry, partial fulfillment replay safety, delivery exception recovery, refund, reconciliation exceptions, and audit immutability.

See [RUNBOOK.md](RUNBOOK.md) for provider recovery, settlement, backup/restore, incident handling, and external launch dependencies.
