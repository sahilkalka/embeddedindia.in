#!/usr/bin/env bash
# ==============================================================================
# Embedded India Portal - Dynamic & Robust Deployment Script
# ==============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo "Usage: ./server-deploy.sh [default|new] [update|clean|fresh]"
  exit 0
fi

# ------------------------------------------------------------------------------
# 1. Target Website Resolution
# ------------------------------------------------------------------------------
SITE_CHOICE="${1:-$TARGET_SITE}"

if [ -z "$SITE_CHOICE" ]; then
  if [ -t 0 ]; then
    echo "Select target website to deploy:"
    echo "  1) Default (embeddedindia.in)"
    echo "  2) New / Staging (new.embeddedindia.in)"
    read -rp "Enter choice [1 or 2, default: 1]: " USER_INPUT

    case "$USER_INPUT" in
      2|new|New)
        SITE_CHOICE="new"
        ;;
      *)
        SITE_CHOICE="default"
        ;;
    esac
  else
    # Non-interactive mode (cPanel Git Deployment, cron, or CI/CD)
    if [[ "$PROJECT_DIR" == *"/new"* ]]; then
      SITE_CHOICE="new"
    else
      SITE_CHOICE="default"
    fi
  fi
fi

case "$SITE_CHOICE" in
  new|New)
    TARGET_NAME="new"
    VENV_NAME="new"
    DOMAIN="new.embeddedindia.in"
    APP_URL="https://new.embeddedindia.in"
    PM2_APP="embeddedindia-new"
    ;;
  default|Default|*)
    TARGET_NAME="default"
    VENV_NAME="embeddedindia.in"
    DOMAIN="embeddedindia.in"
    APP_URL="https://embeddedindia.in"
    PM2_APP="embeddedindia"
    ;;
esac

MODE="${2:-${MODE:-update}}"
NODE_VERSION="22"

echo "============================================================"
echo "🚀 Target Site : ${DOMAIN} (${TARGET_NAME})"
echo "📁 Venv Folder : ${VENV_NAME} (Node ${NODE_VERSION})"
echo "⚙️  Deploy Mode : ${MODE}"
echo "============================================================"

# ------------------------------------------------------------------------------
# 2. Node.js Environment (Strict Version Pinning)
# ------------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  VENV_CANDIDATES=(
    "$HOME/nodevenv/${VENV_NAME}/${NODE_VERSION}/bin/activate"
    "/home/jiazxebj/nodevenv/${VENV_NAME}/${NODE_VERSION}/bin/activate"
  )
  for venv in "${VENV_CANDIDATES[@]}"; do
    if [ -f "$venv" ]; then
      # shellcheck source=/dev/null
      source "$venv"
      echo "✓ Activated environment: $venv"
      break
    fi
  done
fi

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"

if [ -z "$NODE_BIN" ]; then
  echo "❌ Error: Node.js ${NODE_VERSION} binary not found in $HOME/nodevenv/${VENV_NAME}/${NODE_VERSION}."
  exit 1
fi

echo "✓ Node $("$NODE_BIN" -v) / NPM $("$NPM_BIN" -v 2>/dev/null || echo 'unknown')"

# ------------------------------------------------------------------------------
# 3. Environment File Configuration (Safe Cross-Platform Pattern)
# ------------------------------------------------------------------------------
if [ ! -f ".env" ]; then
  cat << EOF > .env
NODE_ENV=production
PORT=3000
APP_URL=${APP_URL}
DATABASE_URL=file:./prisma/dev.db
SESSION_SECRET=embeddedindia_session_secret_2026_${TARGET_NAME}
ADMIN_JWT_SECRET=embeddedindia_jwt_secret_token_9999_${TARGET_NAME}
ADMIN_DEFAULT_EMAIL=admin@embeddedindia.in
ADMIN_DEFAULT_PASSWORD=AdminEmbedded@2026!
EOF
  echo "✓ Created .env file for ${DOMAIN}"
else
  # Safely update APP_URL without OS-dependent sed -i flags
  awk -v url="$APP_URL" '
    BEGIN { updated = 0 }
    /^APP_URL=/ { print "APP_URL=" url; updated = 1; next }
    { print }
    END { if (!updated) print "APP_URL=" url }
  ' .env > .env.tmp && mv .env.tmp .env
  echo "✓ Synchronized APP_URL=${APP_URL} in .env"
fi

# ------------------------------------------------------------------------------
# 4. Storage Directories & Preparation
# ------------------------------------------------------------------------------
mkdir -p prisma tmp public/downloads public/css public/images
rm -rf deep-qa-report test-results playwright-report .playwright-mcp-profile tests 2>/dev/null || true

IS_FRESH=false
if [ "$MODE" = "fresh" ] || [ "$MODE" = "fresh-install" ] || [ "$MODE" = "install" ]; then
  IS_FRESH=true
  echo "✨ Fresh Install Mode activated"
fi

if [ "$IS_FRESH" = true ]; then
  if [ -f "prisma/dev.db" ]; then
    PRE_FRESH_BAK="prisma/dev.db.bak_pre_fresh_$(date +%Y%m%d_%H%M%S)"
    cp "prisma/dev.db" "$PRE_FRESH_BAK"
    echo "✓ Pre-fresh database safety backup: $PRE_FRESH_BAK"
    rm -f prisma/dev.db prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm 2>/dev/null || true
  fi
  echo "🧹 Resetting node_modules and CSS cache..."
  rm -rf node_modules public/css/style.css
elif [ -f "prisma/dev.db" ]; then
  cp "prisma/dev.db" "prisma/dev.db.bak_$(date +%Y%m%d_%H%M%S)"
  echo "✓ SQLite backup created"
  ls -t prisma/dev.db.bak_* 2>/dev/null | tail -n +6 | xargs -r rm -f 2>/dev/null || true
fi

if [ "$MODE" = "clean" ]; then
  rm -rf node_modules public/css/style.css
fi

# ------------------------------------------------------------------------------
# 5. Dependency Installation
# ------------------------------------------------------------------------------
HASH_FILE="node_modules/.deps.hash"
CURRENT_HASH="$(cksum package.json package-lock.json 2>/dev/null || md5sum package.json 2>/dev/null || date)"

if [ "$IS_FRESH" = true ] || [ "$MODE" = "clean" ] || [ ! -d "node_modules" ] || [ ! -f "$HASH_FILE" ] || [ "$(cat "$HASH_FILE" 2>/dev/null)" != "$CURRENT_HASH" ]; then
  echo "📦 Installing production dependencies..."
  "$NPM_BIN" install --omit=dev --no-audit --no-fund --prefer-offline
  echo "$CURRENT_HASH" > "$HASH_FILE"
else
  echo "✓ Dependencies unchanged (skipped install)"
fi

# ------------------------------------------------------------------------------
# 6. Database Initialization & Seeding
# ------------------------------------------------------------------------------
echo "🗄️ Initializing database tables..."
"$NODE_BIN" scripts/init-db.js

if [ "$IS_FRESH" = true ]; then
  echo "🌱 Fresh install: Seeding initial database..."
  "$NODE_BIN" scripts/seed-sqlite.js
  echo "✓ Seed completed"
else
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
    echo "🌱 Seeding initial admin and site configurations..."
    "$NODE_BIN" scripts/seed-sqlite.js
  else
    echo "✓ Existing database confirmed"
  fi
fi

# ------------------------------------------------------------------------------
# 7. CSS Asset Compilation
# ------------------------------------------------------------------------------
if [ ! -f "public/css/style.css" ] || [ "$MODE" = "clean" ] || [ "$IS_FRESH" = true ]; then
  if [ -f "src/public/css/input.css" ]; then
    echo "🎨 Compiling Tailwind CSS..."
    if [ -x "./node_modules/.bin/tailwindcss" ]; then
      ./node_modules/.bin/tailwindcss -i ./src/public/css/input.css -o ./public/css/style.css --minify || true
    else
      npx --yes tailwindcss -i ./src/public/css/input.css -o ./public/css/style.css --minify || true
    fi
  fi
fi

# ------------------------------------------------------------------------------
# 8. Permissions (Standard Secure 755/644) & Server Reload
# ------------------------------------------------------------------------------
chmod 755 tmp prisma public/downloads public/images 2>/dev/null || true
chmod 644 prisma/dev.db* 2>/dev/null || true

# Check only entry files that actually exist
for entry in app.js src/server.js; do
  if [ -f "$entry" ]; then
    "$NODE_BIN" --check "$entry" && echo "✓ Syntax verified: $entry"
  fi
done

# Reload Passenger and PM2
touch tmp/restart.txt
echo "✓ Reloaded Phusion Passenger (tmp/restart.txt)"

if command -v pm2 >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" >/dev/null 2>&1 || pm2 reload embeddedindia >/dev/null 2>&1 || true
fi

echo ""
echo "🎉 Successfully deployed to: ${APP_URL}"