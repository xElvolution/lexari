#!/usr/bin/env bash
set -euo pipefail

# Lexari server setup — Ubuntu 24.04, run as root on a fresh box.
#   bash deploy/setup.sh
# Idempotent: safe to re-run.

REPO="https://github.com/xElvolution/lexari.git"
APP_DIR="/opt/lexari"
NODE_MAJOR=24

echo "== system packages =="
apt-get update -qq
apt-get install -y -qq git curl build-essential ffmpeg \
  fonts-liberation libasound2t64 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
  libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libxcomposite1 \
  libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 xvfb

echo "== node ${NODE_MAJOR} =="
if ! command -v node >/dev/null || [[ "$(node -v | cut -c2-3)" -lt "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
node -v

echo "== app user + checkout =="
id -u lexari &>/dev/null || useradd -r -m -d "${APP_DIR}" -s /bin/bash lexari
if [[ -d "${APP_DIR}/app/.git" ]]; then
  su - lexari -c "cd ${APP_DIR}/app && git pull --ff-only"
else
  su - lexari -c "git clone ${REPO} ${APP_DIR}/app"
fi

echo "== dependencies =="
su - lexari -c "cd ${APP_DIR}/app && npm ci"
su - lexari -c "cd ${APP_DIR}/app && npx remotion browser ensure"
# playwright chromium is only needed for the app-tour template
su - lexari -c "cd ${APP_DIR}/app && npx playwright install chromium" || true

echo "== env =="
if [[ ! -f "${APP_DIR}/app/.env.local" ]]; then
  su - lexari -c "cp ${APP_DIR}/app/.env.example ${APP_DIR}/app/.env.local"
  echo "!! Fill in ${APP_DIR}/app/.env.local before starting services"
fi

echo "== build =="
su - lexari -c "cd ${APP_DIR}/app && npm run build"

echo "== systemd units =="
cp "${APP_DIR}/app/deploy/lexari-web.service" /etc/systemd/system/
cp "${APP_DIR}/app/deploy/lexari-worker.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable lexari-web lexari-worker

echo "== done =="
echo "1. Edit ${APP_DIR}/app/.env.local  (DATABASE_URL, OPENAI_API_KEY, OKX_*, PAY_TO, FILES_SECRET, NEXT_PUBLIC_BASE_URL=https://your-domain)"
echo "2. systemctl start lexari-web lexari-worker"
echo "3. Put Caddy or nginx in front for TLS (deploy/Caddyfile)"
