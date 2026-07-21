const { Pool } = require('pg');
function createPool(config) { return new Pool({ connectionString: config.databaseUrl, ssl: config.databaseSsl, max: 12, idleTimeoutMillis: 10_000 }); }
async function tx(pool, principal, work) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
async function register(client, principal) {
  await client.query(`INSERT INTO commerce_identities(tenant_id,subject,role,email) VALUES($1,$2,$3,$4) ON CONFLICT(tenant_id,subject) DO UPDATE SET role=EXCLUDED.role,email=EXCLUDED.email,active=true`, [principal.tenantId,principal.subject,principal.role,principal.email]);
}
async function audit(client, principal, action, orderId, fromState, toState, metadata={}) {
  await client.query(`INSERT INTO commerce_audit_events(tenant_id,actor_subject,action,order_id,from_state,to_state,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)`, [principal.tenantId,principal.subject,action,orderId||null,fromState||null,toState||null,metadata]);
}
module.exports = { createPool, tx, register, audit };
