/**
 * Embedded India - Self-Bootstrapping Root Entrypoint for cPanel Phusion Passenger
 * 
 * Works 100% out of the box via cPanel "Setup Node.js App" UI without requiring terminal access.
 */
const fs = require('fs');
const path = require('path');

// 0. Ensure environment variables are loaded regardless of Phusion Passenger cwd
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

// 1. Ensure required runtime directories exist
const prismaDir = path.join(__dirname, 'prisma');
const dbFile = path.join(prismaDir, 'dev.db');
const downloadsDir = path.join(__dirname, 'public/downloads');
const tmpDir = path.join(__dirname, 'tmp');

try {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
  if (!fs.existsSync(prismaDir)) fs.mkdirSync(prismaDir, { recursive: true });

  // Self-heal SQLite database permissions so Passenger can write without terminal chmod
  if (fs.existsSync(dbFile)) {
    try { fs.chmodSync(dbFile, 0o666); } catch (e) {}
  }
  try { fs.chmodSync(prismaDir, 0o777); } catch (e) {}
} catch (err) {
  console.warn('[SELF-BOOTSTRAP NOTICE]', err.message);
}

// 2. Initialize a missing SQLite database using the native database scripts
const initDbScript = path.join(__dirname, 'scripts/init-db.js');
const seedSqliteScript = path.join(__dirname, 'scripts/seed-sqlite.js');
try {
  let needsInitialization = false;
  if (!fs.existsSync(dbFile)) {
    needsInitialization = true;
  } else {
    const stats = fs.statSync(dbFile);
    if (stats.size === 0) needsInitialization = true;
  }

  if (needsInitialization) {
    if (!fs.existsSync(initDbScript) || !fs.existsSync(seedSqliteScript)) {
      throw new Error('SQLite initialization scripts are missing.');
    }

    const { execFileSync } = require('child_process');
    console.log('[SELF-BOOTSTRAP] Initializing SQLite database tables...');
    execFileSync(process.execPath, [initDbScript], {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit'
    });
    console.log('[SELF-BOOTSTRAP] Seeding initial admin account and content...');
    execFileSync(process.execPath, [seedSqliteScript], {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit'
    });
  }
} catch (dbErr) {
  console.error('[SELF-BOOTSTRAP DB ERROR]', dbErr);
  process.exit(1);
}

// 4. Delegate to express server
require('./src/server');
