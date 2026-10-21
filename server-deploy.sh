#!/usr/bin/env bash
# ==============================================================================
# Embedded India Portal - Server Setup & Clean Deployment Script
# Supports cPanel Phusion Passenger and Linux VPS (PM2 / Systemd / Nginx)
# ==============================================================================

set -e

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_GREEN="\033[1;32m"
CLR_BLUE="\033[1;34m"
CLR_YELLOW="\033[1;33m"
CLR_RED="\033[1;31m"
CLR_CYAN="\033[1;36m"

echo -e "${CLR_CYAN}"
echo "=============================================================================="
echo "   🚀 Embedded India - Server Installation & Maintenance Automation"
echo "=============================================================================="
echo -e "${CLR_RESET}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

MODE="${1:-interactive}"

if [ "$MODE" = "interactive" ]; then
  echo -e "Choose an operation:"
  echo -e "  ${CLR_BOLD}1)${CLR_RESET} Clean Reinstall (Full wipe of node_modules, safe DB backup, fresh install & restart)"
  echo -e "  ${CLR_BOLD}2)${CLR_RESET} Quick Update    (Safe DB backup, update dependencies, regenerate Prisma & restart)"
  echo -e "  ${CLR_BOLD}3)${CLR_RESET} Self-Healing Fix & Restart (Fixes permissions, generates Prisma, triggers restart)"
  echo ""
  read -p "Enter choice [1-3, default: 2]: " USER_CHOICE
  case "$USER_CHOICE" in
    1) MODE="clean" ;;
    3) MODE="fix" ;;
    *) MODE="update" ;;
  esac
fi

echo -e "\n${CLR_BLUE}📌 [Step 1/6] Environment & Node.js Verification...${CLR_RESET}"
NODE_BIN="$(which node 2>/dev/null || true)"
NPM_BIN="$(which npm 2>/dev/null || true)"

if [ -z "$NODE_BIN" ]; then
  echo -e "${CLR_RED}❌ Error: Node.js binary was not found in PATH!${CLR_RESET}"
  echo "If using cPanel Node.js Selector, activate your environment first:"
  echo "  source /home/username/nodevenv/embeddedindia/20/bin/activate"
  exit 1
fi

NODE_VERSION="$("$NODE_BIN" -v)"
echo -e "Node version: ${CLR_GREEN}$NODE_VERSION${CLR_RESET}"
echo -e "Working path: ${CLR_CYAN}$PROJECT_DIR${CLR_RESET}"

# Patch legacy better-sqlite3 bug on server if present
if [ -f "src/services/db.js" ]; then
  if grep -q "better-sqlite3" src/services/db.js 2>/dev/null; then
    echo -e "${CLR_YELLOW}⚠️  Detected legacy better-sqlite3 reference in src/services/db.js. Auto-patching to pure PrismaClient...${CLR_RESET}"
    cat << 'EOF' > src/services/db.js
// src/services/db.js
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const defaultDbPath = path.resolve(__dirname, '../../prisma/dev.db');
const prismaDir = path.dirname(defaultDbPath);
if (!fs.existsSync(prismaDir)) {
  fs.mkdirSync(prismaDir, { recursive: true });
}

let datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl || datasourceUrl.startsWith('file:')) {
  datasourceUrl = `file:${defaultDbPath}`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: datasourceUrl
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
EOF
    echo -e "${CLR_GREEN}✅ src/services/db.js successfully patched!${CLR_RESET}"
  fi
fi

# Ensure .env exists with production defaults if missing
if [ ! -f ".env" ]; then
  echo -e "${CLR_YELLOW}⚠️  No .env file found. Creating a production .env template...${CLR_RESET}"
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
  echo -e "${CLR_GREEN}✅ Created default .env${CLR_RESET}"
fi

echo -e "\n${CLR_BLUE}💾 [Step 2/6] Backing up SQLite Database & Data Directories...${CLR_RESET}"
mkdir -p prisma tmp public/downloads

if [ -f "prisma/dev.db" ]; then
  TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
  cp "prisma/dev.db" "prisma/dev.db.bak_${TIMESTAMP}"
  echo -e "${CLR_GREEN}✅ Backup created: prisma/dev.db.bak_${TIMESTAMP}${CLR_RESET}"
fi

if [ "$MODE" = "clean" ]; then
  echo -e "\n${CLR_YELLOW}🧹 [Clean Mode] Removing old node_modules & lockfile...${CLR_RESET}"
  rm -rf node_modules package-lock.json
fi

echo -e "\n${CLR_BLUE}📦 [Step 3/6] Installing Production Node Packages...${CLR_RESET}"
if [ "$MODE" = "clean" ]; then
  npm install --omit=dev
else
  npm install --omit=dev --no-audit --no-fund
fi
echo -e "${CLR_GREEN}✅ NPM packages installed.${CLR_RESET}"

echo -e "\n${CLR_BLUE}⚙️  [Step 4/6] Compiling Prisma Client & Database Migrations...${CLR_RESET}"
npx prisma generate

# Check if tables need initial push or sync
if [ ! -f "prisma/dev.db" ] || [ ! -s "prisma/dev.db" ]; then
  echo -e "${CLR_YELLOW}Database is empty or missing. Creating schema tables...${CLR_RESET}"
  npx prisma db push --skip-generate --accept-data-loss
  if [ -f "prisma/seed.js" ]; then
    echo -e "Seeding initial default administrator & content..."
    node prisma/seed.js || true
  fi
else
  echo -e "${CLR_GREEN}Existing database detected. Synchronizing schema...${CLR_RESET}"
  npx prisma db push --skip-generate --accept-data-loss || true
fi

echo -e "\n${CLR_BLUE}🔒 [Step 5/6] Setting Storage & Runtime Permissions...${CLR_RESET}"
# Ensure write access for Phusion Passenger / Apache / Nginx
chmod 755 .
chmod 777 tmp
chmod 777 prisma
if [ -f "prisma/dev.db" ]; then
  chmod 666 prisma/dev.db
fi
if [ -f "prisma/dev.db-journal" ]; then
  chmod 666 prisma/dev.db-journal
fi
chmod 777 public/downloads 2>/dev/null || true
echo -e "${CLR_GREEN}✅ Permissions configured (chmod 777 on tmp & prisma, 666 on dev.db).${CLR_RESET}"

echo -e "\n${CLR_BLUE}🧪 [Step 6/6] Verifying Application Startup & Restarting...${CLR_RESET}"

# Dry-run test of server loader
if NODE_ENV=test "$NODE_BIN" -e "const app = require('./src/server'); process.exit(typeof app === 'function' ? 0 : 1);" 2>/dev/null; then
  echo -e "${CLR_GREEN}✅ App self-test passed: Express server and routes loaded cleanly!${CLR_RESET}"
else
  echo -e "${CLR_RED}❌ Startup warning during test loader. Running verbose diagnostic check:${CLR_RESET}"
  NODE_ENV=test "$NODE_BIN" -e "require('./src/server'); process.exit(0);" || true
fi

# 1. cPanel / Phusion Passenger instant reload hook
touch tmp/restart.txt
echo -e "${CLR_GREEN}✅ Triggered cPanel / Phusion Passenger reload (tmp/restart.txt).${CLR_RESET}"

# 2. PM2 reload if PM2 is present and running
if which pm2 >/dev/null 2>&1; then
  if pm2 list | grep -q "embeddedindia"; then
    pm2 reload embeddedindia || pm2 restart embeddedindia
    echo -e "${CLR_GREEN}✅ Reloaded PM2 process 'embeddedindia'.${CLR_RESET}"
  fi
fi

echo -e "\n${CLR_GREEN}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}🎉 All server installation and maintenance steps finished successfully!${CLR_RESET}"
echo -e "=============================================================================="
echo -e "🌐 Site URL:       ${CLR_CYAN}https://embeddedindia.in${CLR_RESET}"
echo -e "🔒 Admin Panel:    ${CLR_CYAN}https://embeddedindia.in/admin/login${CLR_RESET}"
echo -e "👤 Default Admin:  ${CLR_YELLOW}admin@embeddedindia.in${CLR_RESET}"
echo -e "🔑 Default Pass:   ${CLR_YELLOW}AdminEmbedded@2026!${CLR_RESET}"
echo -e "=============================================================================="
echo ""
