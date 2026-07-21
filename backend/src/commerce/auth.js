const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const ROLES = new Set(['customer', 'operator', 'merchant']);

function authenticateToken(token, config) {
  const claims = jwt.verify(token, config.publicKey, { algorithms: ['RS256'], issuer: config.oidcIssuer, audience: config.oidcAudience, maxAge: '15m', clockTolerance: 5 });
  const role = String(claims.role || '').toLowerCase();
  if (!claims.sub || !claims.tenant_id || !ROLES.has(role)) throw new Error('Token lacks a valid subject, tenant, or role');
  return { subject: claims.sub, tenantId: claims.tenant_id, role, email: claims.email || null, name: claims.name || claims.email || claims.sub };
}

function tokenFrom(req) {
  const header = req.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  const match = (req.get('cookie') || '').match(/(?:^|;\s*)catering_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function localLogin(pool, email, password) {
  const result = await pool.query(`SELECT tenant_id,subject,role,email,password_hash,display_name FROM commerce_identities WHERE LOWER(email)=$1 AND active=true`, [String(email || '').trim().toLowerCase()]);
  const identity = result.rows[0];
  if (!identity?.password_hash || !password) return null;
  const [algorithm,nValue,rValue,pValue,salt,expected] = identity.password_hash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return null;
  const n=Number(nValue),r=Number(rValue),p=Number(pValue);
  if(n!==16384||r!==8||p!==1)return null;
  const actual=await new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,{N:n,r,p,maxmem:64*1024*1024},(error,value)=>error?reject(error):resolve(value)));
  const expectedBytes=Buffer.from(expected,'hex');
  if(actual.length!==expectedBytes.length||!crypto.timingSafeEqual(actual,expectedBytes))return null;
  const token=crypto.randomBytes(32).toString('base64url');
  await pool.query(`INSERT INTO commerce_sessions(token_hash,tenant_id,subject,expires_at) VALUES($1,$2,$3,$4)`,[crypto.createHash('sha256').update(token).digest('hex'),identity.tenant_id,identity.subject,new Date(Date.now()+8*60*60*1000)]);
  return {token,user:{subject:identity.subject,tenantId:identity.tenant_id,role:identity.role,email:identity.email,name:identity.display_name||identity.email||identity.subject}};
}

function auth(config, pool) {
  return async (req, res, next) => {
    try {
      const token = tokenFrom(req); if (!token) return res.status(401).json({ error: 'Authentication required' });
      if (token.split('.').length === 3) req.principal = authenticateToken(token, config);
      else {
        const hash=crypto.createHash('sha256').update(token).digest('hex');
        const result=await pool.query(`SELECT i.tenant_id,i.subject,i.role,i.email,i.display_name FROM commerce_sessions s JOIN commerce_identities i ON i.tenant_id=s.tenant_id AND i.subject=s.subject WHERE s.token_hash=$1 AND s.expires_at>NOW() AND i.active=true`,[hash]);
        const row=result.rows[0];if(!row)throw new Error('inactive session');req.principal={subject:row.subject,tenantId:row.tenant_id,role:row.role,email:row.email,name:row.display_name||row.email||row.subject};
      }
      next();
    } catch { res.status(401).json({ error: 'Invalid or expired organization session' }); }
  };
}

function roles(...allowed) { return (req, res, next) => allowed.includes(req.principal.role) ? next() : res.status(403).json({ error: 'Forbidden' }); }
module.exports = { authenticateToken, auth, roles, localLogin, tokenFrom };
