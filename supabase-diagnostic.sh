#!/bin/bash

# supabase-diagnostic.sh - Verify Supabase environment configuration quickly.

set -euo pipefail

echo "== Supabase configuration diagnostic =="

missing_vars=()
[[ -z "${SUPABASE_URL:-}" ]] && missing_vars+=("SUPABASE_URL")
[[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] && missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  echo "FAIL: Missing required environment variables: ${missing_vars[*]}"
  echo "Action: set them in your shell/.env and Vercel Project Settings -> Environment Variables."
  exit 1
fi
echo "PASS: Required environment variables are set."

if [[ ! "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
  echo "FAIL: SUPABASE_URL does not look valid: $SUPABASE_URL"
  echo "Action: use the exact Project URL from Supabase Settings -> API."
  exit 1
fi
echo "PASS: SUPABASE_URL format looks correct."

set +e
auth_status=$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/")
curl_exit=$?
set -e

if [[ "$curl_exit" -ne 0 ]]; then
  echo "FAIL: Could not reach Supabase REST endpoint (curl exit $curl_exit)."
  echo "Action: verify network connectivity and SUPABASE_URL."
  exit 1
fi

if [[ "$auth_status" == "200" ]]; then
  echo "PASS: Supabase REST endpoint is reachable with provided key (HTTP $auth_status)."
else
  echo "FAIL: Supabase REST endpoint check failed (HTTP $auth_status)."
  echo "Action: verify SUPABASE_SERVICE_ROLE_KEY value and project URL."
  exit 1
fi

if [[ -n "${APP_HEALTH_URL:-}" ]]; then
  health_status=$(curl -sS -o /dev/null -w "%{http_code}" "$APP_HEALTH_URL")
  if [[ "$health_status" == "200" ]]; then
    echo "PASS: App health endpoint reachable (HTTP 200): $APP_HEALTH_URL"
  else
    echo "WARN: App health endpoint returned HTTP $health_status: $APP_HEALTH_URL"
  fi
fi

echo "Diagnostic completed successfully."
