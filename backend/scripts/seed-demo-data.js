const crypto = require('node:crypto');
const { Pool } = require('pg');

function passwordHash(password) {
  const n = 16384;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: n, r, p, maxmem: 64 * 1024 * 1024 }).toString('hex');
  return `scrypt$${n}$${r}$${p}$${salt}$${hash}`;
}

async function seed() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo fixtures require non-production NODE_ENV and ALLOW_DEMO_SEED=true');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const password = process.env.DEMO_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error('DEMO_PASSWORD or ADMIN_PASSWORD must contain at least 12 characters');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const tenantId = 'ca7e0000-0000-4000-8000-000000000001';
  const people = [
    ['demo.operator@catering.test', 'operator', 'Demo Operator'],
    ['demo.merchant@catering.test', 'merchant', 'Demo Merchant'],
    ['demo.customer@catering.test', 'customer', 'Demo Customer'],
  ];
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO commerce_tenants(id,name) VALUES($1,'Catering Demo Company')
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`,
      [tenantId],
    );
    for (const [email, role, name] of people) {
      await client.query(
        `INSERT INTO commerce_identities(tenant_id,subject,role,email,active,password_hash,display_name)
         VALUES($1,$2,$3,$2,true,$4,$5)
         ON CONFLICT(tenant_id,subject) DO UPDATE SET role=EXCLUDED.role,email=EXCLUDED.email,
           active=true,password_hash=EXCLUDED.password_hash,display_name=EXCLUDED.display_name`,
        [tenantId, email, role, passwordHash(password), name],
      );
    }
    await client.query(
      `INSERT INTO commerce_inventory(tenant_id,merchant_subject,sku,name,available_quantity,unit_price_cents)
       SELECT $1, $2, 'DEMO-' || LPAD(n::text,3,'0'), 'Demo catering package ' || n,
              20 + n, 1500 + (n * 275)
       FROM generate_series(1,15) AS n
       ON CONFLICT(tenant_id,merchant_subject,sku) DO UPDATE SET
         name=EXCLUDED.name,available_quantity=EXCLUDED.available_quantity,
         unit_price_cents=EXCLUDED.unit_price_cents,updated_at=now()`,
      [tenantId, people[1][0]],
    );
    await client.query(
      `INSERT INTO commerce_orders(tenant_id,order_number,customer_subject,merchant_subject,state,
          subtotal_cents,tax_cents,total_cents,idempotency_key)
       SELECT $1, 'DEMO-ORDER-' || LPAD(n::text,3,'0'), $2, $3,
              CASE WHEN n % 3 = 0 THEN 'FULFILLED' WHEN n % 3 = 1 THEN 'CAPTURED' ELSE 'AUTHORIZED' END,
              5000 + (n * 500), 400 + (n * 40), 5400 + (n * 540), 'demo-order-' || n
       FROM generate_series(1,15) AS n
       ON CONFLICT(tenant_id,order_number) DO UPDATE SET state=EXCLUDED.state,
         subtotal_cents=EXCLUDED.subtotal_cents,tax_cents=EXCLUDED.tax_cents,
         total_cents=EXCLUDED.total_cents,updated_at=now()`,
      [tenantId, people[2][0], people[1][0]],
    );
    await client.query('COMMIT');
    console.log('Seeded 3 demo personas, 15 inventory items, and 15 orders.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
