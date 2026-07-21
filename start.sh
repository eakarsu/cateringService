#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
app_dir="${RUNTIME_PROJECT_SOURCE:-$project_dir}"
runtime_port="${PORT:-${BACKEND_PORT:-}}"
if [[ "${NODE_ENV:-development}" != production ]]; then
  OIDC_ISSUER="${OIDC_ISSUER:-https://runtime-id.invalid/}"
  OIDC_AUDIENCE="${OIDC_AUDIENCE:-catering-runtime}"
  OIDC_LOGIN_URL="${OIDC_LOGIN_URL:-https://runtime-id.invalid/login}"
  AUTH_PUBLIC_KEY_BASE64="${AUTH_PUBLIC_KEY_BASE64:-$(node -e 'const{publicKey}=require("crypto").generateKeyPairSync("rsa",{modulusLength:2048});process.stdout.write(Buffer.from(publicKey.export({type:"spki",format:"pem"})).toString("base64"))')}"
  WEBHOOK_SIGNING_SECRET="${WEBHOOK_SIGNING_SECRET:-${JWT_SECRET:-runtime-webhook-secret-at-least-32-characters}}"
  TAX_BASE_URL="${TAX_BASE_URL:-https://tax.runtime.invalid}"
  TAX_BEARER_TOKEN="${TAX_BEARER_TOKEN:-runtime-tax-token}"
  PAYMENT_BASE_URL="${PAYMENT_BASE_URL:-https://payment.runtime.invalid}"
  PAYMENT_BEARER_TOKEN="${PAYMENT_BEARER_TOKEN:-runtime-payment-token}"
  DELIVERY_BASE_URL="${DELIVERY_BASE_URL:-https://delivery.runtime.invalid}"
  DELIVERY_BEARER_TOKEN="${DELIVERY_BEARER_TOKEN:-runtime-delivery-token}"
  ALLOW_LOCAL_PASSWORD_LOGIN="${ALLOW_LOCAL_PASSWORD_LOGIN:-true}"
  export OIDC_ISSUER OIDC_AUDIENCE OIDC_LOGIN_URL AUTH_PUBLIC_KEY_BASE64 WEBHOOK_SIGNING_SECRET TAX_BASE_URL TAX_BEARER_TOKEN PAYMENT_BASE_URL PAYMENT_BEARER_TOKEN DELIVERY_BASE_URL DELIVERY_BEARER_TOKEN ALLOW_LOCAL_PASSWORD_LOGIN
fi
case "${1:-start}" in
  check) exec npm --prefix "$app_dir/backend" run check ;;
  migrate)
    if [[ "${ALLOW_SCHEMA_MIGRATION:-0}" != "1" ]]; then echo "Refusing migration: set ALLOW_SCHEMA_MIGRATION=1" >&2; exit 1; fi
    exec npm --prefix "$app_dir/backend" run migrate:deploy ;;
  start)
    [[ -n "$runtime_port" ]] || { echo "PORT or BACKEND_PORT is required" >&2; exit 1; }
    [[ "$runtime_port" =~ ^[0-9]+$ ]] || { echo "runtime port must be numeric" >&2; exit 1; }
    if lsof -tiTCP:"$runtime_port" -sTCP:LISTEN >/dev/null 2>&1; then echo "runtime port $runtime_port is occupied" >&2; exit 1; fi
    PORT="$runtime_port" exec npm --prefix "$app_dir/backend" start ;;
  *) echo "Usage: $0 [check|migrate|start]" >&2; exit 64 ;;
esac
