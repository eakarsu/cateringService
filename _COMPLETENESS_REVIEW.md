# Completeness Review: cateringService

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 97 project files (84 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished commerce/order operations application, not just an empty scaffold. Inspection found 84 source files across `frontend/`, `backend/` using Next.js, React, Express, Prisma; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Implement an idempotent order state machine covering reservation, payment, cancellation, refund, fulfillment, and exception recovery.
2. Connect real inventory, tax, payment, shipping/delivery, and partner-webhook providers behind retry-safe adapters.
3. Add role-scoped customer, operator, and merchant workflows with immutable order and refund audit history.
4. Test duplicate webhooks, partial fulfillment, payment failure, overselling, and reconciliation end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.
- Regression risk is high because no recognizable project-owned automated tests cover the main path.

## Evidence inspected

- `README.md`
- `frontend/src/App.jsx:28`
- `backend/prisma/seed.js:822`
- `frontend/src/App.jsx`
- `backend/package.json`
- `start.sh`

## Recommended next action

Choose one real commerce/order operations journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress (2026-07-19)

Implemented the production commerce journey as a dedicated, tenant-scoped API and role-aware UI. The persisted order state machine covers tax calculation, atomic inventory reservation, payment request/failure/retry, paid cancellation and refund, partial/full fulfillment, delivery dispatch, delivery exception/recovery, completion, and terminal conflicts. Customers are limited to their own orders, merchants to assigned inventory/orders, and operators to provider execution and reconciliation; short-lived RS256 organization sessions carry the tenant and role. Inventory pricing is authoritative on the server, reservation rolls back the whole transaction on shortage, fulfillment and checkout are idempotent, and every transition/refund/provider action is written to database-enforced append-only history.

Real tax, payment, refund/reconciliation, and delivery HTTP contracts now sit behind retry-safe adapters. Durable jobs retain provider/idempotency keys, responses, attempt counts, exponential retry timing, terminal dead letters, and sanitized error codes. Partner webhooks are HMAC signed, tenant bound, delivery-ID deduplicated, and transactional. Payment reconciliation persists missing-provider-reference exceptions. The focused production UI exposes customer checkout/payment/cancellation, merchant inventory/reservation/fulfillment/delivery recovery, and operator job/reconciliation queues. Legacy broad CRUD, seed, generic-AI, generated-gap, and demo routes are not mounted by the production entrypoint.

Startup no longer creates/resets/seeds databases, rewrites environment files, prints credentials, or kills processes. Configuration and schema checks fail closed; replay-safe migration requires explicit opt-in. Added a non-root container, provider/incident runbook, CI for migration-backed tests and both builds, and zero-audit dependency sets.

Verification completed against disposable PostgreSQL database `clinical_codex_catering_20260719`: the migration was applied twice and all 7 backend tests passed, including the real HTTP/PostgreSQL checkout-to-completion and paid-refund journey with duplicate checkout/webhooks, tenant/customer/merchant boundaries, oversell rollback, payment decline/retry, partial-fulfillment replay, delivery exception recovery, reconciliation exceptions, and audit immutability. Backend syntax build, production frontend Vite build, startup configuration/schema check, both npm audits (zero vulnerabilities), shell syntax, and `git diff --check` passed.

External-only launch dependencies remain: contracted tax/payment/delivery accounts, provider webhook secrets and settlement feeds, PCI-scoped hosted payment tokenization, tax nexus rules, merchant/customer IdP provisioning, carrier SLAs, observability/on-call integration, and a witnessed backup restoration.

## Runtime verification (2026-07-20)

- The launcher now requires the assigned port, refuses conflicts, launches the real source tree from the isolated fixture, and supplies only non-production local adapter/identity configuration while production continues to fail closed on incomplete OIDC, TLS, and provider settings.
- Added an explicit scrypt administrator provisioner, additive identity/session migration, opaque hashed PostgreSQL sessions for local acceptance, database revalidation in `/api/auth/me`, and logout revocation. RS256 organization sessions remain supported and production password login remains disabled by default.
- First acceptance passed on fresh PostgreSQL `55631`, API `6076`, and reserved UI `6077` as `startup_login_session_api`; migration and provisioning occurred before startup and all ports were released.
- Six domain/config/provider tests passed, with the opt-in PostgreSQL journey correctly skipped without its database flag; backend syntax build, frontend Vite build, launcher syntax, and whitespace validation passed. Browser-data freshness warnings were advisory only.
