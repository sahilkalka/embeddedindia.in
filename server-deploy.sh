#!/usr/bin/env bash
# ==============================================================================
# Embedded India Portal - Lightweight Server Deployment Script
# Supports cPanel Phusion Passenger, GitHub Actions CI/CD, and Linux VPS
# ==============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

MODE="${1:-update}"
echo "🚀 Deploying Embedded India [Mode: ${MODE}]"

# 1. Detect & Activate Node.js Environment (cPanel nodevenv / system)
if ! command -v node >/dev/null 2>&1; then
  for venv in \
    /home/jiazxebj/nodevenv/embeddedindia.in/20/bin/activate \
    /home/jiazxebj/nodevenv/embeddedindia.in/22/bin/activate \
    /home/jiazxebj/nodevenv/embeddedindia/20/bin/activate \
    /home/jiazxebj/nodevenv/embeddedindia/22/bin/activate \
    "$HOME"/nodevenv/*/*/bin/activate; do
    if [ -f "$venv" ]; then
      # shellcheck source=/dev/null
      source "$venv"
      break
    fi
  done
fi

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"

if [ -z "$NODE_BIN" ]; then
  echo "❌ Error: Node.js binary not found. Please activate your environment."
  exit 1
fi

echo "✓ Node $("$NODE_BIN" -v) / NPM $("$NPM_BIN" -v 2>/dev/null || echo 'unknown')"

# 2. Ensure Environment Configuration
if [ ! -f ".env" ]; then
  cat << 'EOF' > .env
NODE_ENV=production
PORT=3000
APP_URL=https://embeddedindia.in
DATABASE_URL=file:./prisma/dev.db
SESSION_SECRET=embeddedindia_session_secret_2026_xyz
ADMIN_JWT_SECRET=embeddedindia_jwt_secret_token_9999_xyz
ADMIN_DEFAULT_EMAIL=admin@embeddedindia.in
ADMIN_DEFAULT_PASSWORD=AdminEmbedded@2026!
EOF
  echo "✓ Created default .env"
fi

# 3. Directories & Database Backup
mkdir -p prisma tmp public/downloads public/css
if [ -f "prisma/dev.db" ]; then
  cp "prisma/dev.db" "prisma/dev.db.bak_$(date +%Y%m%d_%H%M%S)"
  echo "✓ SQLite backup created"
fi

if [ "$MODE" = "clean" ]; then
  rm -rf node_modules
fi

# 4. Dependency Installation (cached by package hash)
HASH_FILE="node_modules/.deps.hash"
CURRENT_HASH="$(cksum package.json package-lock.json 2>/dev/null || md5sum package.json 2>/dev/null || date)"

if [ "$MODE" = "clean" ] || [ ! -d "node_modules" ] || [ ! -f "$HASH_FILE" ] || [ "$(cat "$HASH_FILE" 2>/dev/null)" != "$CURRENT_HASH" ]; then
  echo "📦 Installing production dependencies..."
  "$NPM_BIN" install --omit=dev --no-audit --no-fund --prefer-offline
  echo "$CURRENT_HASH" > "$HASH_FILE"
else
  echo "✓ Dependencies unchanged (skipped npm install)"
fi

# 5. Database Initialization & Seeding
"$NODE_BIN" scripts/init-db.js

# Auto-seed if database is new or was recovered from corruption
ADMIN_EXISTS="$("$NODE_BIN" -e "
  try {
    const Database = require('better-sqlite3');
    const db = new Database('prisma/dev.db');
    const row = db.prepare('SELECT 1 FROM User WHERE role = ? LIMIT 1').get('admin');
    process.stdout.write(row ? 'yes' : 'no');
    db.close();
  } catch (e) {
    process.stdout.write('no');
  }
" 2>/dev/null || echo "no")"

if [ "$ADMIN_EXISTS" != "yes" ]; then
  echo "🌱 Seeding initial database & admin..."
  "$NODE_BIN" scripts/seed-sqlite.js
else
  echo "✓ Existing database confirmed (admin account present)"
fi

# 6. Tailwind Production CSS
if [ -f "src/public/css/input.css" ]; then
  echo "🎨 Building production CSS..."
  npx --yes tailwindcss -i ./src/public/css/input.css -o ./public/css/style.css --minify || true
fi

# 7. File Permissions for Phusion Passenger
chmod 777 tmp prisma public/downloads 2>/dev/null || true
chmod 666 prisma/dev.db* 2>/dev/null || true

# 8. Syntax Verification & Phusion Passenger Reload
"$NODE_BIN" --check app.js src/server.js && echo "✓ Application syntax verified"

# Restart Passenger / PM2
touch tmp/restart.txt
echo "✓ Touched tmp/restart.txt (Passenger reload)"

if command -v pm2 >/dev/null 2>&1; then
  pm2 reload embeddedindia >/dev/null 2>&1 || true
fi

echo "🎉 Deployment complete: https://embeddedindia.in"
