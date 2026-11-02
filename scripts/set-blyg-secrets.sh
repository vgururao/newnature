#!/bin/bash
# One-time: generate the blyg-newnature owner password and cookie secret, following
# Code/devops/security-policy.md Rule 1 — show, save to .env, register in Code/.env.keys,
# and only then set as Worker secrets. Refuses to run if either is already registered.
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
CODE="$(cd "$PROJECT/../.." && pwd)"
STUDIO="$CODE/blygger-protocol/blygger-studio"
KEYS="$CODE/.env.keys"
ENVF="$PROJECT/.env"

if grep -q '^BLYG_NEWNATURE_' "$KEYS" "$ENVF" 2>/dev/null; then
  echo "BLYG_NEWNATURE_* already registered — not regenerating. Rotate per Rule 3 instead." >&2
  exit 1
fi

# Rule 6: both ignores must be in place before a secret is written.
xattr -w com.dropbox.ignored 1 "$ENVF"
grep -qx '.env' "$PROJECT/.gitignore"

PW=$(openssl rand -base64 18 | tr -d '/+=')
CS=$(openssl rand -hex 32)

echo "BLYG_NEWNATURE_OWNER_PASSWORD=$PW"
echo "BLYG_NEWNATURE_COOKIE_SECRET=$CS"

cat >> "$ENVF" <<EOF
# blyg-newnature Worker secrets (registered in Code/.env.keys). Generated $(date +%F).
BLYG_NEWNATURE_OWNER_PASSWORD=$PW
BLYG_NEWNATURE_COOKIE_SECRET=$CS
EOF

cat >> "$KEYS" <<EOF

# ── Blyg: newnature.venkateshrao.com (New Nature book) ─────────────
# Used by: Publishing/newnature (copy in its .env); Worker "blyg-newnature" on the PERSONAL
# account (7026b5d7…), Custom Domain newnature.venkateshrao.com, D1 blyg-newnature
# (7b9534e4-fc27-4874-8a83-0001d066f7a6), R2 blyg-newnature-media. Created $(date +%F).
# Worker secrets OWNER_PASSWORD / COOKIE_SECRET. No AI_PROVIDER_KEY yet (see devops/status.md).
BLYG_NEWNATURE_OWNER_PASSWORD=$PW
BLYG_NEWNATURE_COOKIE_SECRET=$CS
EOF

echo "Saved to $ENVF and registered in $KEYS. Setting Worker secrets…"
unset CLOUDFLARE_API_TOKEN
cd "$STUDIO"
printf '%s' "$PW" | npx wrangler secret put OWNER_PASSWORD --config wrangler.private.jsonc --env newnature
printf '%s' "$CS" | npx wrangler secret put COOKIE_SECRET --config wrangler.private.jsonc --env newnature
echo "Done. Sign in at https://newnature.venkateshrao.com/studio"
