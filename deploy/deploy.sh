#!/usr/bin/env bash
# ============================================================
#  WMS Ecosystem — Hostinger VPS deploy script
#
#  Pipeline:
#    Claude Code → GitHub (main) → THIS SCRIPT on VPS → nginx → site
#
#  First run:
#    sudo ./deploy/deploy.sh --first-run
#
#  Regular deploy (after `git push`):
#    ./deploy/deploy.sh
#
#  What it does:
#    1. Verify Node ≥ 20, npm ≥ 10, pm2.
#    2. git pull origin main.
#    3. npm ci    (workspace-aware, installs all apps + backend).
#    4. Backend: prisma migrate deploy + db:seed (idempotent).
#    5. Build backend (tsc) and all 5 frontends (vite build) — for each
#       frontend Vite is told its base path (e.g. /staff/) so URLs work.
#    6. Restart API via pm2 (or start if first run).
#    7. Reload nginx.
# ============================================================

set -euo pipefail

# ---------- CONFIG (override via env if needed) ----------
APP_DIR="${APP_DIR:-/var/www/wms}"
GIT_BRANCH="${GIT_BRANCH:-main}"
NODE_MIN_MAJOR=20
PM2_APP_NAME="wms-api"
# ---------------------------------------------------------

c_log()  { echo -e "\033[1;36m[deploy]\033[0m $*"; }
c_ok()   { echo -e "\033[1;32m[ ok  ]\033[0m $*"; }
c_warn() { echo -e "\033[1;33m[warn ]\033[0m $*"; }
c_err()  { echo -e "\033[1;31m[fail ]\033[0m $*" >&2; }

require() { command -v "$1" >/dev/null 2>&1 || { c_err "Missing: $1"; exit 1; }; }

check_node() {
  local v
  v="$(node -v | sed 's/v//' | cut -d. -f1)"
  if [ "$v" -lt "$NODE_MIN_MAJOR" ]; then
    c_err "Need Node >= ${NODE_MIN_MAJOR}, found v$(node -v)"
    exit 1
  fi
}

# ---------- Preflight ----------
c_log "Preflight checks…"
require git
require node
require npm
check_node

if ! command -v pm2 >/dev/null 2>&1; then
  c_warn "pm2 not installed; installing globally"
  sudo npm install -g pm2
fi
c_ok "Node $(node -v), npm $(npm -v)"

# ---------- Repo ----------
if [ ! -d "${APP_DIR}/.git" ]; then
  c_err "${APP_DIR} is not a git repo. Clone first:"
  c_err "  sudo mkdir -p ${APP_DIR} && sudo chown -R \$USER:\$USER ${APP_DIR}"
  c_err "  git clone <git_url> ${APP_DIR}"
  exit 1
fi

cd "${APP_DIR}"
c_log "git pull origin ${GIT_BRANCH}…"
git fetch --all --prune
git reset --hard "origin/${GIT_BRANCH}"
c_ok "Code at $(git rev-parse --short HEAD)"

# ---------- Install (workspaces) ----------
c_log "npm ci (root workspaces)…"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  c_warn "no package-lock.json — using npm install"
  npm install --no-audit --no-fund
fi
c_ok "Dependencies installed"

# ---------- Database ----------
c_log "Prisma generate + migrate…"
npm --workspace backend/api run db:generate
npx --workspace backend/api prisma migrate deploy
c_ok "Database migrated"

if [ "${1:-}" == "--first-run" ] || [ "${SEED_DB:-0}" == "1" ]; then
  c_log "Seeding initial data…"
  npm --workspace backend/api run db:seed
  c_ok "Seeded"
fi

# ---------- Build backend ----------
c_log "Building API…"
npm run build:api
c_ok "API built"

# ---------- Build frontends with correct base paths ----------
build_app() {
  local pkg="$1" base="$2"
  c_log "Building $pkg with base=$base…"
  ( cd "apps/$pkg" && VITE_BASE="$base" npx vite build --base="$base" )
}
build_app admin-panel      /admin/
build_app staff-app        /staff/
build_app supervisor-panel /supervisor/
build_app seller-app       /seller/
build_app courier-app      /courier/
build_app customer-app     /customer/
build_app pickup-point-app /pickup/
c_ok "All 7 frontends built"

# ---------- Start / restart API via pm2 ----------
c_log "(Re)starting API with pm2…"
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP_NAME" --update-env
else
  cd "$APP_DIR/backend/api"
  pm2 start "node dist/server.js" --name "$PM2_APP_NAME" --env production
  pm2 save
  cd "$APP_DIR"
fi
c_ok "API running on :4000"

# ---------- Nginx reload ----------
if command -v nginx >/dev/null 2>&1; then
  c_log "Testing nginx config…"
  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    c_ok "nginx reloaded"
  else
    c_warn "nginx config invalid — reload skipped"
  fi
else
  c_warn "nginx not installed — see deploy/nginx/wms.conf"
fi

c_ok "Deploy complete. Open the site at your VPS IP/domain."
