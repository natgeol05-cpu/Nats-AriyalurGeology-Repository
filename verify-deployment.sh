#!/usr/bin/env bash
# =============================================================================
# verify-deployment.sh — Ariyalur Geology: Automated Deployment Verification
# =============================================================================
# Usage:
#   chmod +x verify-deployment.sh
#   ./verify-deployment.sh [--env staging|production] [--base-url URL] [--help]
#
# Options:
#   --env          Target environment: staging | production (default: production)
#   --base-url     Override the backend base URL for health checks
#   --help         Show this help message
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[PASS]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[FAIL]${RESET}  $*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}===> $*${RESET}"; }

# ── defaults ──────────────────────────────────────────────────────────────────
ENV="production"
CUSTOM_BASE_URL=""

# Production & staging URLs — update these after deployment
PROD_FRONTEND_URL="https://natswebsite.com"
PROD_BACKEND_URL="https://ariyalur-api.vercel.app"
STAGING_FRONTEND_URL="https://ariyalur-staging.vercel.app"
STAGING_BACKEND_URL="https://ariyalur-api-staging.vercel.app"

for arg in "$@"; do
  case "$arg" in
    --env=*) ENV="${arg#*=}" ;;
    --base-url=*) CUSTOM_BASE_URL="${arg#*=}" ;;
    --help)
      sed -n '2,14p' "$0" | sed 's/^# //'
      exit 0
      ;;
    *) error "Unknown option: $arg"; exit 1 ;;
  esac
done

case "$ENV" in
  production)
    FRONTEND_URL="$PROD_FRONTEND_URL"
    BACKEND_URL="${CUSTOM_BASE_URL:-$PROD_BACKEND_URL}"
    ;;
  staging)
    FRONTEND_URL="$STAGING_FRONTEND_URL"
    BACKEND_URL="${CUSTOM_BASE_URL:-$STAGING_BACKEND_URL}"
    ;;
  *)
    error "Unknown --env value: $ENV (use 'staging' or 'production')"
    exit 1
    ;;
esac

# ── counters ──────────────────────────────────────────────────────────────────
TOTAL=0; PASSED=0; FAILED=0; WARNED=0

check() {
  local name="$1" result="$2"
  shift 2
  local detail="${*:-}"
  (( TOTAL++ )) || true
  case "$result" in
    pass)
      success "$name"
      (( PASSED++ )) || true
      ;;
    fail)
      error  "$name${detail:+ — }${detail}"
      (( FAILED++ )) || true
      ;;
    warn)
      warn  "$name${detail:+ — }${detail}"
      (( WARNED++ )) || true
      ;;
  esac
}

# ── helper: HTTP check ────────────────────────────────────────────────────────
http_check() {
  local url="$1" expected_code="${2:-200}" timeout="${3:-15}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" "$url" 2>/dev/null) || code="000"
  echo "$code"
}

# ── banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "  Ariyalur Geology — Deployment Verification"
echo -e "  Environment: ${ENV} | $(date -u +"%Y-%m-%dT%H:%M:%SZ")${RESET}"
echo ""

# =============================================================================
step "1/6 — Frontend availability"
# =============================================================================

info "Checking frontend: $FRONTEND_URL"
code=$(http_check "$FRONTEND_URL")
if [[ "$code" == "200" ]]; then
  check "Frontend homepage reachable (HTTP 200)" pass
elif [[ "$code" =~ ^30[0-9]$ ]]; then
  check "Frontend returns redirect ($code → likely HTTPS)" warn
elif [[ "$code" == "000" ]]; then
  check "Frontend homepage" fail "Could not connect to $FRONTEND_URL"
else
  check "Frontend homepage (HTTP $code)" fail "Expected 200"
fi

# Check that key HTML page exists
for page in "index.html" "AriyalurFossilsGallery.html" "UploadFossilImageAndDetails.html"; do
  code=$(http_check "${FRONTEND_URL}/${page}")
  if [[ "$code" == "200" ]]; then
    check "Page exists: $page" pass
  elif [[ "$code" == "404" ]]; then
    check "Page missing: $page" fail "HTTP 404"
  else
    check "Page: $page (HTTP $code)" warn
  fi
done

# =============================================================================
step "2/6 — Backend health checks"
# =============================================================================

info "Checking backend: $BACKEND_URL"

# Health endpoint
code=$(http_check "${BACKEND_URL}/health")
if [[ "$code" == "200" ]]; then
  check "Backend /health endpoint (HTTP 200)" pass
  # Get response body for more detail
  HEALTH_BODY=$(curl -s --connect-timeout 10 "${BACKEND_URL}/health" 2>/dev/null) || HEALTH_BODY="{}"
  if echo "$HEALTH_BODY" | grep -q '"status"'; then
    check "Backend health response body valid JSON" pass
  else
    check "Backend health response body" warn "Unexpected format: ${HEALTH_BODY:0:80}"
  fi
elif [[ "$code" == "000" ]]; then
  check "Backend /health endpoint" fail "Could not connect to $BACKEND_URL — is it deployed?"
else
  check "Backend /health endpoint" fail "HTTP $code (expected 200)"
fi

# API version endpoint
code=$(http_check "${BACKEND_URL}/api/version")
case "$code" in
  200) check "GET /api/version" pass ;;
  404) check "GET /api/version" warn "Endpoint not implemented" ;;
  *)   check "GET /api/version" warn "HTTP $code" ;;
esac

# =============================================================================
step "3/6 — Database connectivity"
# =============================================================================

# Load .env if available for direct Supabase check
if [[ -f "backend/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -v '^\s*#' backend/.env | grep -v '^\s*$')
  set +a

  if [[ -n "${SUPABASE_URL:-}" ]] && [[ "${SUPABASE_URL}" != "https://YOUR_PROJECT_ID.supabase.co" ]]; then
    # registrations table
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      "${SUPABASE_URL}/rest/v1/registrations?limit=1" 2>/dev/null) || code="000"
    if [[ "$code" == "200" ]]; then
      check "Supabase 'registrations' table accessible" pass
    else
      check "Supabase 'registrations' table" fail "HTTP $code"
    fi

    # fossil_details table
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      "${SUPABASE_URL}/rest/v1/fossil_details?limit=1" 2>/dev/null) || code="000"
    if [[ "$code" == "200" ]]; then
      check "Supabase 'fossil_details' table accessible" pass
    else
      check "Supabase 'fossil_details' table" fail "HTTP $code"
    fi

    # Storage bucket
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      "${SUPABASE_URL}/storage/v1/bucket/${SUPABASE_STORAGE_BUCKET:-fossil-images}" 2>/dev/null) || code="000"
    if [[ "$code" == "200" ]]; then
      check "Supabase storage bucket '${SUPABASE_STORAGE_BUCKET:-fossil-images}' exists" pass
    else
      check "Supabase storage bucket" fail "HTTP $code"
    fi
  else
    check "Supabase credentials" warn "Placeholder values in backend/.env — skipping direct DB check"
  fi
else
  check "Database check" warn "backend/.env not found — skipping direct DB check"
fi

# =============================================================================
step "4/6 — API endpoint validation"
# =============================================================================

# POST /api/register — expect 400 on empty body (not 500/000)
code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${BACKEND_URL}/api/register" 2>/dev/null) || code="000"
case "$code" in
  400|422) check "POST /api/register (validation rejects empty body)" pass ;;
  201|200) check "POST /api/register (accepted — check with valid data)" warn ;;
  000)     check "POST /api/register" fail "Could not connect to backend" ;;
  *)       check "POST /api/register" fail "HTTP $code (expected 400/422)" ;;
esac

# POST /api/fossils — expect 400 on empty body
code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${BACKEND_URL}/api/fossils" 2>/dev/null) || code="000"
case "$code" in
  400|422) check "POST /api/fossils (validation rejects empty body)" pass ;;
  201|200) check "POST /api/fossils (accepted — check with valid data)" warn ;;
  000)     check "POST /api/fossils" fail "Could not connect to backend" ;;
  *)       check "POST /api/fossils" fail "HTTP $code (expected 400/422)" ;;
esac

# GET /api/fossils — list endpoint
code=$(http_check "${BACKEND_URL}/api/fossils")
case "$code" in
  200) check "GET /api/fossils (list endpoint)" pass ;;
  404) check "GET /api/fossils" warn "Endpoint not found" ;;
  000) check "GET /api/fossils" fail "Could not connect" ;;
  *)   check "GET /api/fossils" warn "HTTP $code" ;;
esac

# =============================================================================
step "5/6 — Performance metrics"
# =============================================================================

measure_ttfb() {
  local url="$1"
  curl -s -o /dev/null \
    -w "%{time_starttransfer}" \
    --connect-timeout 15 \
    "$url" 2>/dev/null || echo "N/A"
}

info "Measuring time-to-first-byte (TTFB)..."

FRONTEND_TTFB=$(measure_ttfb "$FRONTEND_URL")
if [[ "$FRONTEND_TTFB" != "N/A" ]]; then
  TTFB_MS=$(echo "$FRONTEND_TTFB * 1000" | bc 2>/dev/null | cut -d. -f1) || TTFB_MS="?"
  if (( ${TTFB_MS:-9999} < 1000 )); then
    check "Frontend TTFB: ${TTFB_MS}ms (< 1000ms)" pass
  elif (( ${TTFB_MS:-9999} < 3000 )); then
    check "Frontend TTFB: ${TTFB_MS}ms (< 3000ms)" warn "Consider CDN caching"
  else
    check "Frontend TTFB: ${TTFB_MS}ms (> 3000ms)" fail "Performance degraded"
  fi
else
  check "Frontend TTFB" warn "Could not measure"
fi

BACKEND_TTFB=$(measure_ttfb "${BACKEND_URL}/health")
if [[ "$BACKEND_TTFB" != "N/A" ]]; then
  TTFB_MS=$(echo "$BACKEND_TTFB * 1000" | bc 2>/dev/null | cut -d. -f1) || TTFB_MS="?"
  if (( ${TTFB_MS:-9999} < 2000 )); then
    check "Backend TTFB: ${TTFB_MS}ms (< 2000ms)" pass
  else
    check "Backend TTFB: ${TTFB_MS}ms (> 2000ms)" warn "Backend may be cold-starting"
  fi
else
  check "Backend TTFB" warn "Could not measure"
fi

# =============================================================================
step "6/6 — Final report"
# =============================================================================

echo ""
echo -e "  ┌────────────────────────────────────────────────────┐"
printf  "  │  Total: %-3s  " "$TOTAL"
printf  "Passed: %-3s  " "$PASSED"
printf  "Failed: %-3s  " "$FAILED"
printf  "Warned: %-3s  │\n" "$WARNED"
echo -e "  └────────────────────────────────────────────────────┘"
echo ""

if (( FAILED == 0 && WARNED == 0 )); then
  success "All checks passed — ${ENV} deployment is healthy! 🎉"
  exit 0
elif (( FAILED == 0 )); then
  warn "Deployment is operational with ${WARNED} warning(s)"
  exit 0
else
  error "Deployment has ${FAILED} failure(s) — investigate before proceeding"
  exit 1
fi
