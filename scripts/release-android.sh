#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Checking EAS login..."
if ! npx eas-cli whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx eas-cli login"
  exit 1
fi

if ! grep -q '"projectId"' app.json 2>/dev/null; then
  echo "==> Linking Expo project (eas init)..."
  npx eas-cli init --id "$(npx eas-cli project:info --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).id||'')}catch{}})" 2>/dev/null || true)" 2>/dev/null || npx eas-cli init
fi

if [ -f .env ]; then
  echo "==> Syncing production env vars from .env (if missing)..."
  # shellcheck disable=SC1091
  set -a && source .env && set +a
  if [ -n "${EXPO_PUBLIC_SUPABASE_URL:-}" ]; then
    npx eas-cli env:create production --name EXPO_PUBLIC_SUPABASE_URL --value "$EXPO_PUBLIC_SUPABASE_URL" --visibility plaintext --force 2>/dev/null || true
  fi
  if [ -n "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
    npx eas-cli env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "$EXPO_PUBLIC_SUPABASE_ANON_KEY" --visibility sensitive --force 2>/dev/null || true
  fi
  if [ -n "${EXPO_PUBLIC_PRIVACY_POLICY_URL:-}" ]; then
    npx eas-cli env:create production --name EXPO_PUBLIC_PRIVACY_POLICY_URL --value "$EXPO_PUBLIC_PRIVACY_POLICY_URL" --visibility plaintext --force 2>/dev/null || true
  fi
  if [ -n "${EXPO_PUBLIC_TERMS_URL:-}" ]; then
    npx eas-cli env:create production --name EXPO_PUBLIC_TERMS_URL --value "$EXPO_PUBLIC_TERMS_URL" --visibility plaintext --force 2>/dev/null || true
  fi
fi

echo "==> Building Android production AAB..."
npm run build:android

echo "==> Submitting to Google Play (internal track, draft)..."
npm run submit:android

echo "Done. Finish the release in Google Play Console."
