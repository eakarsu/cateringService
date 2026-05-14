// Custom feature endpoints (batch_09 audit suggestions)
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callLLM(system, user, maxTokens = 1700, temperature = 0.4) {
  if (!process.env.OPENROUTER_API_KEY) {
    const e = new Error('OPENROUTER_API_KEY missing'); e.statusCode = 503; throw e;
  }
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: maxTokens, temperature,
    }),
  });
  const data = await r.json();
  return { content: data?.choices?.[0]?.message?.content || '', model: data?.model };
}

function parseJSON(t) {
  if (!t) return null;
  const c = String(t).replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const m = c.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function err(res, e, label) {
  if (e.statusCode === 503) return res.status(503).json({ error: e.message });
  console.error(`${label} error:`, e.message);
  res.status(500).json({ error: e.message });
}

// 1. Predictive menu success by client profile + cuisine
router.post('/menu-success', authenticate, async (req, res) => {
  try {
    const { client_profile, menu, occasion } = req.body || {};
    if (!menu) return res.status(400).json({ error: 'menu required' });
    const ai = await callLLM(
      'You predict menu success based on client profile + occasion. JSON only.',
      `CLIENT: ${JSON.stringify(client_profile || {})}\nMENU: ${JSON.stringify(menu)}\nOCCASION: ${occasion || 'corporate lunch'}\nReturn JSON {"success_score":0,"loved_dishes":[""],"risky_dishes":[""],"swap_suggestions":[{"replace":"","with":"","why":""}]}`
    );
    res.json({ type: 'menu-success', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'menu-success'); }
});

// 2. Dynamic pricing (demand, ingredient costs, season)
router.post('/dynamic-pricing', authenticate, async (req, res) => {
  try {
    const { base_per_guest_usd, guest_count, event_date, ingredient_cost_index } = req.body || {};
    if (!base_per_guest_usd) return res.status(400).json({ error: 'base_per_guest_usd required' });
    const ai = await callLLM(
      'You price catering events factoring demand, ingredient cost index, and season. JSON only.',
      `BASE_PER_GUEST_USD: ${base_per_guest_usd}\nGUESTS: ${guest_count}\nDATE: ${event_date || 'TBD'}\nINGREDIENT_INDEX: ${ingredient_cost_index || 1.0}\nReturn JSON {"per_guest_usd":0,"total_usd":0,"demand_modifier":0,"seasonal_modifier":0,"discount_levers":[""]}`
    );
    res.json({ type: 'dynamic-pricing', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'dynamic-pricing'); }
});

// 3. Delivery route optimization with traffic prediction
// TODO: configure credentials for TRAFFIC_API_KEY (Google Maps Traffic).
router.post('/delivery-routing', authenticate, async (req, res) => {
  try {
    const { stops, departure_time, vehicles } = req.body || {};
    if (!Array.isArray(stops)) return res.status(400).json({ error: 'stops array required' });
    const ai = await callLLM(
      `You sequence catering delivery stops minimizing predicted traffic delays. Traffic API: ${Boolean(process.env.TRAFFIC_API_KEY)}. JSON only.`,
      `STOPS: ${JSON.stringify(stops.slice(0, 30))}\nDEPARTURE: ${departure_time || 'morning'}\nVEHICLES: ${JSON.stringify(vehicles || [])}\nReturn JSON {"sequenced":[{"stop_id":"","eta":"","vehicle_id":""}],"total_minutes":0,"backup_plan":""}`
    );
    res.json({ type: 'delivery-routing', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'delivery-routing'); }
});

// 4. Equipment utilization scheduling
router.post('/equipment-scheduling', authenticate, async (req, res) => {
  try {
    const { upcoming_events, equipment_inventory } = req.body || {};
    if (!Array.isArray(upcoming_events) || !Array.isArray(equipment_inventory)) return res.status(400).json({ error: 'upcoming_events and equipment_inventory required' });
    const ai = await callLLM(
      'You assign equipment to upcoming events to maximize utilization without conflicts. JSON only.',
      `EVENTS: ${JSON.stringify(upcoming_events.slice(0, 20))}\nINVENTORY: ${JSON.stringify(equipment_inventory.slice(0, 60))}\nReturn JSON {"assignments":[{"event_id":"","equipment_id":""}],"conflicts":[""],"underutilized":[""],"rental_recommended":[""]}`
    );
    res.json({ type: 'equipment-scheduling', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'equipment-scheduling'); }
});

// 5. Predictive staffing (labor hours by event size)
router.post('/staffing-prediction', authenticate, async (req, res) => {
  try {
    const { event } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event required' });
    const ai = await callLLM(
      'You predict catering staffing needs by event size and complexity. JSON only.',
      `EVENT: ${JSON.stringify(event)}\nReturn JSON {"roles":[{"role":"server|chef|driver","count":0,"hours_each":0}],"total_labor_hours":0,"projected_cost_usd":0,"buffer_pct":0}`
    );
    res.json({ type: 'staffing-prediction', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'staffing-prediction'); }
});

// 6. Customer satisfaction prediction with post-event feedback
router.post('/satisfaction-prediction', authenticate, async (req, res) => {
  try {
    const { event_id, in_flight_signals } = req.body || {};
    const ai = await callLLM(
      'You predict client satisfaction after a catering event from real-time signals. JSON only.',
      `EVENT: ${event_id || 'recent'}\nSIGNALS: ${JSON.stringify(in_flight_signals || {})}\nReturn JSON {"predicted_csat":0,"risk_factors":[""],"recovery_actions":[""],"followup_template":""}`
    );
    res.json({ type: 'satisfaction-prediction', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'satisfaction-prediction'); }
});

// 7. Supplier auto-ordering integration
// TODO: configure credentials for SUPPLIER_API_KEY.
router.post('/supplier-autoorder', authenticate, async (req, res) => {
  try {
    const { event, current_inventory } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event required' });
    const ai = await callLLM(
      `You generate supplier purchase orders to fill the gap between event needs and current inventory. Supplier API: ${Boolean(process.env.SUPPLIER_API_KEY)}. JSON only.`,
      `EVENT: ${JSON.stringify(event)}\nINVENTORY: ${JSON.stringify(current_inventory || [])}\nReturn JSON {"orders":[{"supplier":"","lines":[{"sku":"","qty":0,"unit":""}],"estimated_total_usd":0,"eta_days":0}]}`
    );
    res.json({ type: 'supplier-autoorder', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'supplier-autoorder'); }
});

module.exports = router;
