# Audit Apply Notes — cateringService

Source: `_AUDIT/reports/batch_09.md` § cateringService

## Original audit recommendations

### Missing AI counterparts
- Menu optimization
- Proposal optimization
- Delivery routing

### Missing non-AI features
- Equipment management
- Dietary restriction tracking
- Supplier SLA management

### Custom feature ideas
- Predictive menu success by client profile + cuisine
- Dynamic pricing (demand, ingredient costs, season)
- Delivery route optimization with traffic prediction
- Equipment utilization scheduling
- Predictive staffing (labor hours by event size/complexity)
- Customer satisfaction prediction with post-event feedback
- Integration with ingredient suppliers for auto-ordering

## Implemented this pass

All implemented in `backend/src/routes/ai.js`, mounted under `/api/ai`:

- `POST /api/ai/menu-optimize` — pulls a menu package (with items if available), accepts event-type/guest-count/dietary/budget/season, returns JSON with add/remove/swap recommendations and per-person cost delta. Mechanical implementation of "Menu optimization".
- `POST /api/ai/proposal-optimize` — pulls a proposal, accepts competitive context + client profile, returns JSON section rewrites, pricing adjustments, value props, risk warnings. Mechanical implementation of "Proposal optimization".
- `POST /api/ai/delivery-route` — accepts stops + vehicle + start address + event start, returns JSON visit order + per-stop arrive/depart + total minutes. Mechanical implementation of "Delivery routing".

All three reuse the existing `callOpenRouter` helper. Prisma calls are wrapped in try/catch so missing tables/relations do not crash the endpoints. Syntax-checked with `node --check`.

## Backlog (not implemented)

### Needs schema/data model work
- Equipment management — needs equipment table, availability, maintenance schedule.
- Dietary restriction tracking at the guest level (per-guest manifests).
- Supplier SLA management — needs SLA contract + breach tracking.

### Needs product decision
- Dynamic pricing — needs decision on pricing levers and surge bounds.
- Predictive menu success — needs labelled outcomes dataset.
- Predictive staffing — needs historical labour-hours-by-event dataset.
- Customer satisfaction prediction — needs post-event feedback pipeline.
- Auto-ordering with suppliers — needs supplier integration choice (EDI? webhooks?).

### Larger AI work
- Real-time traffic prediction for routing (would need maps API; "no new external SDK deps" rule).

## Categorisation

- MECHANICAL: menu-optimize, proposal-optimize, delivery-route (all done).
- NEEDS-SCHEMA: equipment management, guest-level dietary tracking, supplier SLA.
- NEEDS-PRODUCT-DECISION: dynamic pricing, predictive menu success, predictive staffing, satisfaction prediction, auto-ordering.
- NEEDS-CREDS: traffic prediction (Google/Mapbox integration not introduced this pass).

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS — FE already wired.
- **Stack:** Vite-React + Tailwind (frontend), Express + Prisma (backend).
- `frontend/src/pages/AIInsights.jsx` exposes a tool selector calling the three apply-pass-2 endpoints: `/ai/menu-optimize`, `/ai/proposal-optimize`, `/ai/delivery-route` (icons: UtensilsCrossed, FileSignature, Truck).
- `frontend/src/pages/AIAssistant.jsx` calls `/ai/chat` for conversational AI.
- `CostEstimator` page covers the `/ai/quick-quote` flow.
- Routes in `App.jsx`: `/ai` and `/ai-insights` are registered.
- JWT/auth handled centrally via `utils/api` axios instance + `AuthContext` (Bearer from `localStorage`).

## Apply pass 4 (mechanical backlog)

SKIPPED. All MECHANICAL items (menu-optimize, proposal-optimize, delivery-route) were implemented in apply pass 2 and wired to `AIInsights.jsx` in pass 3. Remaining backlog is NEEDS-SCHEMA (equipment management, guest-level dietary tracking, supplier SLA), NEEDS-PRODUCT-DECISION (dynamic pricing, predictive menu success / staffing / satisfaction, auto-ordering), or NEEDS-CREDS (real-time traffic prediction).
