#!/usr/bin/env bash
# ============================================================
#  Warehouse App — отдельный VPS deploy.
#
#  Билдит ТОЛЬКО apps/warehouse-app и кладёт его в /warehouse/
#  под nginx. Не трогает admin-panel, не трогает backend, не
#  трогает другие apps. Безопасно запускать когда меняется
#  только этот workspace.
#
#  Запуск вручную:
#    ./deploy/deploy-warehouse.sh
#  Через GitHub Actions:
#    .github/workflows/deploy-warehouse-app.yml
# ============================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/wms}"
GIT_BRANCH="${GIT_BRANCH:-main}"
WAREHOUSE_BASE="${WAREHOUSE_BASE:-/warehouse/}"

c_log()  { echo -e "\033[1;36m[warehouse]\033[0m $*"; }
c_ok()   { echo -e "\033[1;32m[   ok   ]\033[0m $*"; }
c_warn() { echo -e "\033[1;33m[  warn  ]\033[0m $*"; }
c_err()  { echo -e "\033[1;31m[  fail  ]\033[0m $*" >&2; }

require() { command -v "$1" >/dev/null 2>&1 || { c_err "Missing: $1"; exit 1; }; }

# ---------- Preflight ----------
require git
require node
require npm

if [ ! -d "${APP_DIR}/.git" ]; then
  c_err "${APP_DIR} is not a git repo. Run the main deploy.sh --first-run first."
  exit 1
fi

cd "${APP_DIR}"

# ---------- Pull ----------
c_log "git pull origin ${GIT_BRANCH}…"
git fetch --all --prune
git reset --hard "origin/${GIT_BRANCH}"
c_ok "Code at $(git rev-parse --short HEAD)"

# ---------- Install (workspaces) ----------
# npm ci/install на корне подхватит apps/warehouse-app автоматически
# (workspaces уже включают apps/*).
c_log "npm install (workspace-aware)…"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  c_warn "no package-lock.json — using npm install"
  npm install --no-audit --no-fund
fi
c_ok "Dependencies installed"

# ---------- Build only warehouse-app ----------
c_log "Building warehouse-app with base=${WAREHOUSE_BASE}…"
( cd "apps/warehouse-app" \
    && VITE_API_URL=/api VITE_BASE="${WAREHOUSE_BASE}" \
       npx vite build --base="${WAREHOUSE_BASE}" )
c_ok "warehouse-app built → apps/warehouse-app/dist"

# ---------- Nginx reload (config файлы не трогаем — только проверяем) ----------
if command -v nginx >/dev/null 2>&1; then
  c_log "Testing nginx config…"
  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    c_ok "nginx reloaded"
  else
    c_warn "nginx config invalid — reload skipped"
  fi
else
  c_warn "nginx not installed — skipping reload"
fi

c_ok "Warehouse App deploy complete. Open: https://<your-host>${WAREHOUSE_BASE}"
