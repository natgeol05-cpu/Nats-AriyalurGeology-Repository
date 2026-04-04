#!/usr/bin/env bash
# =============================================================================
# setup.sh — Ariyalur Geology Website: Automated Environment Setup
# =============================================================================
# Usage:
#   chmod +x setup.sh
#   ./setup.sh [--skip-secrets] [--dry-run] [--help]
#
# Options:
#   --skip-secrets   Skip GitHub Secrets validation (useful for local dev)
#   --dry-run        Print actions without executing them
#   --help           Show this help message
# =============================================================================

set -euo pipefail

# ── colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ── helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}===> $*${RESET}"; }
dry()     { echo -e "${YELLOW}[DRY-RUN]${RESET} would run: $*"; }

# ── flags ─────────────────────────────────────────────────────────────────────
SKIP_SECRETS=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --skip-secrets) SKIP_SECRETS=true ;;
    --dry-run)      DRY_RUN=true ;;
    --help)
      sed -n '2,15p' "$0" | sed 's/^# //'
      exit 0
      ;;
    *) error "Unknown option: $arg"; exit 1 ;;
  esac
done

run() {
  if $DRY_RUN; then dry "$*"; else eval "$*"; fi
}

# ── banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
cat <<'BANNER'
  ___           _             _
 / _ \  _ __  | |  ___  ___ | |_    ___   ___  _   _
| | | || '_ \ | | / _ \/ __|| __|  / _ \ / _ \| | | |
| |_| || | | || ||  __/\__ \| |_  | (_) |  __/| |_| |
 \___/ |_| |_||_| \___||___/ \__|  \___/ \___| \__, |
                                                |___/
 Ariyalur Geology — Automated Environment Setup
BANNER
echo -e "${RESET}"

# ── 1. prerequisites ──────────────────────────────────────────────────────────
step "1/7 — Checking prerequisites"

check_cmd() {
  local cmd="$1" install_hint="$2"
  if command -v "$cmd" &>/dev/null; then
    success "$cmd found ($(command -v "$cmd"))"
  else
    error "$cmd is not installed. $install_hint"
    exit 1
  fi
}

check_cmd node  "Install from https://nodejs.org (v18+ recommended)"
check_cmd npm   "Comes bundled with Node.js"
check_cmd git   "Install from https://git-scm.com"
check_cmd curl  "Install via your OS package manager"

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
MAJOR=${NODE_VER%%.*}
if (( MAJOR < 18 )); then
  error "Node.js v18 or higher required (found v${NODE_VER})"
  exit 1
fi
success "Node.js v${NODE_VER} — version requirement met"

# ── 2. directory structure ────────────────────────────────────────────────────
step "2/7 — Creating directory structure"

DIRS=(
  backend
  backend/routes
  backend/middleware
  backend/utils
  backend/tests
  backend/logs
  docs
)

for dir in "${DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    info "Directory already exists: $dir"
  else
    run "mkdir -p $dir"
    success "Created: $dir"
  fi
done

# ── 3. dependency installation ────────────────────────────────────────────────
step "3/7 — Installing backend dependencies"

BACKEND_PKG="backend/package.json"
if [[ ! -f "$BACKEND_PKG" ]]; then
  info "No package.json found — generating one"
  run "cat > $BACKEND_PKG" <<'PKGJSON'
{
  "name": "ariyalur-geology-backend",
  "version": "1.0.0",
  "description": "Backend API for Ariyalur Geology website",
  "main": "server.js",
  "engines": { "node": ">=18" },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage",
    "lint": "eslint ."
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "express-rate-limit": "^7.2.0",
    "helmet": "^7.1.0",
    "multer": "^2.1.1",
    "nodemailer": "^8.0.4",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.0",
    "supertest": "^6.3.4"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
PKGJSON
fi

if [[ -d "backend/node_modules" ]]; then
  info "node_modules already exists — skipping install (use 'npm ci' to reinstall)"
else
  info "Running npm install inside backend/"
  run "(cd backend && npm install --loglevel=warn)"
  success "Dependencies installed"
fi

# ── 4. configuration file generation ─────────────────────────────────────────
step "4/7 — Generating configuration files"

# .env.example
ENV_EXAMPLE="backend/.env.example"
if [[ ! -f "$ENV_EXAMPLE" ]]; then
  run "cat > $ENV_EXAMPLE" <<'ENVEX'
# ── Supabase ─────────────────────────────────────────────────────────────────
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ── Server ────────────────────────────────────────────────────────────────────
PORT=8080
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,https://natswebsite.com

# ── Email (optional notifications) ───────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFY_EMAIL=admin@natswebsite.com

# ── Storage ───────────────────────────────────────────────────────────────────
SUPABASE_STORAGE_BUCKET=fossil-images
MAX_FILE_SIZE_MB=10
ENVEX
  success "Created: $ENV_EXAMPLE"
else
  info "Already exists: $ENV_EXAMPLE"
fi

# .env (local, only if missing)
if [[ ! -f "backend/.env" ]]; then
  run "cp backend/.env.example backend/.env"
  warn "Created backend/.env from template — fill in real credentials before running"
else
  info "backend/.env already exists — not overwriting"
fi

# .gitignore for backend
GITIGNORE="backend/.gitignore"
if [[ ! -f "$GITIGNORE" ]]; then
  run "cat > $GITIGNORE" <<'GITIG'
node_modules/
.env
*.log
coverage/
dist/
GITIG
  success "Created: $GITIGNORE"
fi

# nodemon config
NODEMON="backend/nodemon.json"
if [[ ! -f "$NODEMON" ]]; then
  run "cat > $NODEMON" <<'NMON'
{
  "watch": ["."],
  "ext": "js,json",
  "ignore": ["node_modules", "logs", "coverage"],
  "delay": 1000
}
NMON
  success "Created: $NODEMON"
fi

# ── 5. GitHub Secrets validation ──────────────────────────────────────────────
step "5/7 — Validating GitHub Secrets"

if $SKIP_SECRETS; then
  warn "Skipping GitHub Secrets check (--skip-secrets flag set)"
else
  info "Checking required GitHub repository secrets are configured"
  echo ""
  echo -e "  The following secrets MUST be set in:"
  echo -e "  ${CYAN}GitHub → Repository → Settings → Secrets and variables → Actions${RESET}"
  echo ""

  REQUIRED_SECRETS=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "VERCEL_TOKEN"
    "VERCEL_ORG_ID"
    "VERCEL_PROJECT_ID"
  )

  OPTIONAL_SECRETS=(
    "SMTP_HOST"
    "SMTP_USER"
    "SMTP_PASS"
    "NOTIFY_EMAIL"
  )

  printf "  %-35s %s\n" "SECRET NAME" "STATUS"
  printf "  %-35s %s\n" "-----------" "------"

  missing=0
  for secret in "${REQUIRED_SECRETS[@]}"; do
    # We can't read secret values from shell; check via gh CLI if available
    if command -v gh &>/dev/null; then
      if gh secret list 2>/dev/null | grep -q "^${secret}"; then
        printf "  ${GREEN}%-35s FOUND${RESET}\n" "$secret"
      else
        printf "  ${RED}%-35s MISSING ← ACTION REQUIRED${RESET}\n" "$secret"
        (( missing++ )) || true
      fi
    else
      printf "  ${YELLOW}%-35s UNKNOWN (gh CLI not installed)${RESET}\n" "$secret"
    fi
  done

  echo ""
  for secret in "${OPTIONAL_SECRETS[@]}"; do
    if command -v gh &>/dev/null; then
      if gh secret list 2>/dev/null | grep -q "^${secret}"; then
        printf "  ${GREEN}%-35s FOUND (optional)${RESET}\n" "$secret"
      else
        printf "  ${YELLOW}%-35s NOT SET (optional)${RESET}\n" "$secret"
      fi
    else
      printf "  ${YELLOW}%-35s UNKNOWN (optional — gh CLI not installed)${RESET}\n" "$secret"
    fi
  done

  if (( missing > 0 )); then
    echo ""
    warn "${missing} required secret(s) missing. Add them before deploying."
  fi
fi

# ── 6. pre-deployment checks ──────────────────────────────────────────────────
step "6/7 — Running pre-deployment checks"

PASS=0; FAIL=0

check_item() {
  local label="$1" result="$2"   # result: "ok" | "fail" | "warn"
  shift 2
  local detail="$*"
  case "$result" in
    ok)   success "$label"; (( PASS++ )) || true ;;
    warn) warn    "$label — $detail" ;;
    fail) error   "$label — $detail"; (( FAIL++ )) || true ;;
  esac
}

# Git
if git rev-parse --git-dir &>/dev/null; then
  check_item "Git repository initialised" ok
else
  check_item "Git repository" fail "Not inside a git repo"
fi

# Remote origin
if git remote get-url origin &>/dev/null; then
  REMOTE=$(git remote get-url origin)
  check_item "Git remote origin set ($REMOTE)" ok
else
  check_item "Git remote origin" fail "No remote origin configured"
fi

# .env file
if [[ -f "backend/.env" ]]; then
  if grep -q "YOUR_PROJECT_ID\|your-supabase" backend/.env; then
    check_item "backend/.env configured" warn "Still contains placeholder values"
  else
    check_item "backend/.env configured" ok
  fi
else
  check_item "backend/.env file" fail "File not found — run ./setup-env.sh"
fi

# package.json
if [[ -f "backend/package.json" ]]; then
  check_item "backend/package.json present" ok
else
  check_item "backend/package.json" fail "File not found"
fi

# node_modules
if [[ -d "backend/node_modules" ]]; then
  check_item "backend/node_modules installed" ok
else
  check_item "backend/node_modules" fail "Run: cd backend && npm install"
fi

# server.js
if [[ -f "backend/server.js" ]]; then
  check_item "backend/server.js present" ok
else
  check_item "backend/server.js" warn "Not yet created — see PIPELINE_GUIDE.md"
fi

# Vercel config
if [[ -f "VERCEL.JSON" ]] || [[ -f "vercel.json" ]]; then
  check_item "Vercel config present" ok
else
  check_item "vercel.json" warn "No Vercel config found"
fi

# GitHub workflows
if [[ -f ".github/workflows/jekyll-gh-pages.yml" ]]; then
  check_item "GitHub Actions workflow present" ok
else
  check_item "GitHub Actions workflow" fail ".github/workflows/ not set up"
fi

echo ""
echo -e "  Pre-deployment checks: ${GREEN}${PASS} passed${RESET}, ${RED}${FAIL} failed${RESET}"

# ── 7. summary ────────────────────────────────────────────────────────────────
step "7/7 — Setup summary"

echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo ""
echo -e "  1. Fill in credentials:  ${CYAN}nano backend/.env${RESET}"
echo -e "  2. Validate credentials: ${CYAN}./setup-env.sh${RESET}"
echo -e "  3. Start backend:        ${CYAN}cd backend && npm start${RESET}"
echo -e "  4. Verify deployment:    ${CYAN}./verify-deployment.sh${RESET}"
echo -e "  5. See full pipeline:    ${CYAN}cat PIPELINE_GUIDE.md${RESET}"
echo -e "  6. See checklists:       ${CYAN}cat CHECKLIST.md${RESET}"
echo ""

if (( FAIL > 0 )); then
  warn "Setup completed with ${FAIL} issue(s). Address them before deploying."
  exit 1
else
  success "Setup completed successfully. You are ready to deploy! 🎉"
fi
