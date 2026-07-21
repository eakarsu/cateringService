const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

function requireValue(name, env) {
  const value = env[name];
  if (!value || /change-me|replace-me|replace-with|example\.org|base64-encoded/i.test(value)) throw new Error(`${name} must be configured with a non-placeholder value`);
  return value;
}

function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const publicKey = Buffer.from(requireValue('AUTH_PUBLIC_KEY_BASE64', env), 'base64').toString('utf8');
  if (!publicKey.includes('BEGIN PUBLIC KEY')) throw new Error('AUTH_PUBLIC_KEY_BASE64 must contain an RS256 public key');
  const webhookSecret = requireValue('WEBHOOK_SIGNING_SECRET', env);
  if (webhookSecret.length < 32) throw new Error('WEBHOOK_SIGNING_SECRET must be at least 32 characters');
  const config = {
    production, host: env.HOST || '127.0.0.1', port: Number(env.PORT),
    databaseUrl: requireValue('DATABASE_URL', env), databaseSsl: env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : false,
    oidcIssuer: requireValue('OIDC_ISSUER', env), oidcAudience: requireValue('OIDC_AUDIENCE', env), oidcLoginUrl: requireValue('OIDC_LOGIN_URL', env), publicKey, webhookSecret,
    allowMigration: env.ALLOW_SCHEMA_MIGRATION === '1',
    tax: { baseUrl: requireValue('TAX_BASE_URL', env), token: requireValue('TAX_BEARER_TOKEN', env) },
    payment: { baseUrl: requireValue('PAYMENT_BASE_URL', env), token: requireValue('PAYMENT_BEARER_TOKEN', env) },
    delivery: { baseUrl: requireValue('DELIVERY_BASE_URL', env), token: requireValue('DELIVERY_BEARER_TOKEN', env) },
    localLogin: !production && env.ALLOW_LOCAL_PASSWORD_LOGIN === 'true'
  };
  if (production && !config.databaseSsl) throw new Error('DATABASE_SSL=require is mandatory in production');
  if (!Number.isInteger(config.port) || config.port < 1) throw new Error('PORT must be a valid TCP port');
  return config;
}

module.exports = { loadConfig };
