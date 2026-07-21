'use strict';
const crypto = require('node:crypto');
const { Pool } = require('pg');

function tenantUuid(value) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')) return value;
  const hex = crypto.createHash('sha256').update(value || '').digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

async function main() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Runtime Admin';
  const tenantId = tenantUuid(process.env.TENANT_ID || process.env.GOVERNANCE_TENANT_ID || '');
  if (!email.includes('@')) throw new Error('ADMIN_EMAIL is required');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  const salt = crypto.randomBytes(16).toString('hex'), n = 16384, r = 8, p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N: n, r, p, maxmem: 64 * 1024 * 1024 }).toString('hex');
  const passwordHash = `scrypt$${n}$${r}$${p}$${salt}$${hash}`;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`INSERT INTO commerce_tenants(id,name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`, [tenantId, 'Runtime Acceptance Tenant']);
    await pool.query(
      `INSERT INTO commerce_identities(tenant_id,subject,role,email,active,password_hash,display_name)
       VALUES($1,'runtime-admin','operator',$2,true,$3,$4)
       ON CONFLICT(tenant_id,subject) DO UPDATE SET role='operator',email=EXCLUDED.email,active=true,password_hash=EXCLUDED.password_hash,display_name=EXCLUDED.display_name`,
      [tenantId, email, passwordHash, name],
    );
    process.stdout.write(`provisioned ${email}\n`);
  } finally { await pool.end(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
