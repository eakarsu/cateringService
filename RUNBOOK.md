# Governed commerce runbook

## Release and startup

Production uses only `backend/src/index.js` and the governed commerce routes. Legacy CRUD, seed, generic AI, generated-gap, upload, and demo routes remain in source for reference but are not mounted. Do not expose them through a second entrypoint.

1. Provision a `commerce_tenants` row and configure the identity provider to emit its UUID in `tenant_id`, with one role: `customer`, `merchant`, or `operator`.
2. Supply every value in `.env.example` from managed secrets. Provider tokens must be scoped to tax calculation, payment capture/refund/reconciliation, and delivery dispatch respectively.
3. Apply the replay-safe migration only from the release job: `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`.
4. Run `./start.sh check`, then `./start.sh start`. Startup never seeds, resets, creates a database, rewrites `.env`, or kills processes.

## Operations

- Provider jobs use tenant/provider idempotency keys. Transient 429/5xx outcomes retry with exponential delay; terminal errors and the fifth failure go to dead letter.
- Payment and delivery webhooks require HMAC-SHA256 `X-Signature`, `X-Tenant-Id`, and unique `X-Delivery-Id`. Alert on signature failures and dead letters.
- Inventory reservation is atomic and rolls back the whole order on shortage. Partial fulfillment decrements only reserved quantity. Cancellation releases unfulfilled reservations and queues refunds for paid orders.
- Operators should run payment reconciliation daily. Every missing provider reference creates a durable exception. Resolve exceptions against provider settlement records; never edit audit events.
- Back up PostgreSQL with point-in-time recovery. Quarterly restoration drills must verify tenant isolation, inventory/reservation sums, order state, successful provider references, refund totals, webhook uniqueness, and immutable audit continuity.

## Incident handling

Stop provider job execution, not the database, when payment or delivery behavior is suspect. Preserve webhook bodies and audit sequences, rotate the affected provider credential, reconcile from the last known-good settlement window, then resume queued jobs with their original idempotency keys. Never replay a capture or refund under a new key without operator review.

## External blockers

Production activation still requires real organization SSO, merchant/customer provisioning, contracted tax/payment/delivery APIs and webhook secrets, PCI-scoped hosted payment tokenization, tax nexus configuration, carrier service levels, settlement accounts, observability/on-call integration, and a witnessed backup restoration. Repository code cannot supply those commercial accounts or compliance approvals.
