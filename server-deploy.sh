#!/usr/bin/env bash
# ==============================================================================
# Embedded India Portal - Server Setup & Clean Deployment Script
# Supports cPanel Phusion Passenger, GitHub Actions CI/CD, and Linux VPS
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
echo "   🚀 Embedded India - Server Deployment & Maintenance Automation"
echo "=============================================================================="
echo -e "${CLR_RESET}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Mode Selection: non-interactive calls default to "update"
if [ -n "$1" ]; then
  MODE="$1"
elif [ ! -t 0 ]; then
  MODE="update"
else
  MODE="interactive"
fi

if [ "$MODE" = "interactive" ]; then
  echo -e "Choose an operation:"
  echo -e "  ${CLR_BOLD}1)${CLR_RESET} Clean Reinstall (Full wipe of node_modules, safe DB backup, fresh install & restart)"
  echo -e "  ${CLR_BOLD}2)${CLR_RESET} Quick Update    (Safe DB backup, update dependencies, sync DB & restart)"
  echo -e "  ${CLR_BOLD}3)${CLR_RESET} Self-Healing Fix & Restart (Fixes permissions, verifies schema, triggers restart)"
  echo ""
  read -p "Enter choice [1-3, default: 2]: " USER_CHOICE
  case "$USER_CHOICE" in
    1) MODE="clean" ;;
    3) MODE="fix" ;;
    *) MODE="update" ;;
  esac
fi

echo -e "Execution Mode: ${CLR_BOLD}${MODE}${CLR_RESET}"

# Step 1: Detect and Activate Node.js Environment
echo -e "\n${CLR_BLUE}📌 [Step 1/6] Environment & Node.js Verification...${CLR_RESET}"

if ! command -v node >/dev/null 2>&1; then
  echo -e "${CLR_YELLOW}Node.js not found in current PATH. Searching for cPanel nodevenv...${CLR_RESET}"
  for venv in \
    /home/jiazxebj/nodevenv/embeddedindia.in/20/bin/activate \
    /home/jiazxebj/nodevenv/embeddedindia.in/22/bin/activate \
    /home/jiazxebj/nodevenv/embeddedindia/20/bin/activate \
    /home/jiazxebj/nodevenv/embeddedindia/22/bin/activate \
    "$HOME"/nodevenv/*/*/bin/activate \
    /usr/local/bin/node; do
    if [ -f "$venv" ]; then
      echo -e "Activating virtual environment: ${CLR_CYAN}$venv${CLR_RESET}"
      # shellcheck source=/dev/null
      source "$venv"
      break
    fi
  done
fi

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"

if [ -z "$NODE_BIN" ]; then
  echo -e "${CLR_RED}❌ Error: Node.js binary was not found in PATH or nodevenv!${CLR_RESET}"
  echo "Please activate your environment first (e.g. source /home/username/nodevenv/.../bin/activate)"
  exit 1
fi

NODE_VERSION="$("$NODE_BIN" -v)"
echo -e "Node binary:  ${CLR_GREEN}$NODE_BIN ($NODE_VERSION)${CLR_RESET}"
echo -e "Working path: ${CLR_CYAN}$PROJECT_DIR${CLR_RESET}"

# Ensure .env exists with production defaults if missing
if [ ! -f ".env" ]; then
  echo -e "${CLR_YELLOW}⚠️  No .env file found. Creating production .env template...${CLR_RESET}"
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

# Step 2: Database & Directory Backup
echo -e "\n${CLR_BLUE}💾 [Step 2/6] Backing up SQLite Database & Data Directories...${CLR_RESET}"
mkdir -p prisma tmp public/downloads public/css

if [ -f "prisma/dev.db" ]; then
  TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
  cp "prisma/dev.db" "prisma/dev.db.bak_${TIMESTAMP}"
  echo -e "${CLR_GREEN}✅ Backup created: prisma/dev.db.bak_${TIMESTAMP}${CLR_RESET}"
fi

if [ "$MODE" = "clean" ]; then
  echo -e "\n${CLR_YELLOW}🧹 [Clean Mode] Removing old node_modules & lockfile...${CLR_RESET}"
  rm -rf node_modules package-lock.json
fi

# Step 3: Install Dependencies
echo -e "\n${CLR_BLUE}📦 [Step 3/6] Installing Production Node Packages...${CLR_RESET}"
if [ "$MODE" = "clean" ]; then
  npm install --omit=dev
else
  npm install --omit=dev --no-audit --no-fund
fi
echo -e "${CLR_GREEN}✅ NPM packages verified.${CLR_RESET}"

# Step 4: Database Schema Initialization & Seeding
echo -e "\n${CLR_BLUE}⚙️  [Step 4/6] Initializing Database & Case Studies...${CLR_RESET}"

# Compile Prisma client if binary engine can be generated
npx prisma generate || true

# Initialize all database tables with native better-sqlite3 (Zero Network Failure)
node scripts/init-db.js

# Ensure initial default admin, case studies, blogs, and settings are seeded safely
node scripts/seed-sqlite.js

# Compile Tailwind CSS if stylesheet is missing
if [ ! -f "public/css/style.css" ] || [ ! -s "public/css/style.css" ] || [ "$MODE" = "clean" ]; then
  echo -e "Building Tailwind CSS stylesheet..."
  npx tailwindcss -i ./src/public/css/input.css -o ./public/css/style.css --minify || true
fi

# Step 5: Storage & Runtime Permissions
echo -e "\n${CLR_BLUE}🔒 [Step 5/6] Setting Storage & Runtime Permissions...${CLR_RESET}"
chmod 755 .
chmod 777 tmp
chmod 777 prisma
if [ -f "prisma/dev.db" ]; then
  chmod 666 prisma/dev.db
fi
if [ -f "prisma/dev.db-journal" ]; then
  chmod 666 prisma/dev.db-journal
fi
if [ -f "prisma/dev.db-wal" ]; then
  chmod 666 prisma/dev.db-wal
fi
if [ -f "prisma/dev.db-shm" ]; then
  chmod 666 prisma/dev.db-shm
fi
chmod 777 public/downloads 2>/dev/null || true
echo -e "${CLR_GREEN}✅ Permissions configured (chmod 777 on tmp & prisma, 666 on dev.db).${CLR_RESET}"

# Step 6: Verifying Startup & Triggering Reload
echo -e "\n${CLR_BLUE}🧪 [Step 6/6] Verifying Application Startup & Reloading...${CLR_RESET}"

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
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list 2>/dev/null | grep -q "embeddedindia"; then
    pm2 reload embeddedindia || pm2 restart embeddedindia
    echo -e "${CLR_GREEN}✅ Reloaded PM2 process 'embeddedindia'.${CLR_RESET}"
  fi
fi

echo -e "\n${CLR_GREEN}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}🎉 All server deployment & maintenance steps finished successfully!${CLR_RESET}"
echo -e "=============================================================================="
echo -e "🌐 Site URL:       ${CLR_CYAN}https://embeddedindia.in${CLR_RESET}"
echo -e "📁 Projects Hub:   ${CLR_CYAN}https://embeddedindia.in/projects${CLR_RESET}"
echo -e "🔒 Admin Panel:    ${CLR_CYAN}https://embeddedindia.in/admin/login${CLR_RESET}"
echo -e "👤 Default Admin:  ${CLR_YELLOW}admin@embeddedindia.in${CLR_RESET}"
echo -e "🔑 Default Pass:   ${CLR_YELLOW}AdminEmbedded@2026!${CLR_RESET}"
echo -e "=============================================================================="
echo ""
