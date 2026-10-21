/**
 * Embedded India - Self-Bootstrapping Root Entrypoint for cPanel Phusion Passenger
 * 
 * Works 100% out of the box via cPanel "Setup Node.js App" UI without requiring terminal access.
 */
const fs = require('fs');
const path = require('path');

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

// 2. Ensure Prisma client engine is generated for this Linux host
const schemaPath = path.join(prismaDir, 'schema.prisma');
const clientEngine = path.join(__dirname, 'node_modules/.prisma/client');
const prismaCli = path.join(__dirname, 'node_modules/prisma/build/index.js');

if (!fs.existsSync(clientEngine) && fs.existsSync(schemaPath)) {
  try {
    const { execSync } = require('child_process');
    console.log('[SELF-BOOTSTRAP] Compiling Prisma Client engine for Linux host...');
    if (fs.existsSync(prismaCli)) {
      execSync(`"${process.execPath}" "${prismaCli}" generate --schema="${schemaPath}"`, {
        cwd: __dirname,
        env: process.env,
        stdio: 'inherit'
      });
    } else {
      execSync(`npx prisma generate --schema="${schemaPath}"`, {
        cwd: __dirname,
        env: process.env,
        stdio: 'inherit'
      });
    }
    console.log('[SELF-BOOTSTRAP] Prisma Client successfully compiled.');
  } catch (e) {
    console.warn('[SELF-BOOTSTRAP WARNING] Prisma generate note:', e.message);
  }
}

// 3. Ensure SQLite database is initialized with tables
try {
  let needsPush = false;
  if (!fs.existsSync(dbFile)) {
    needsPush = true;
  } else {
    const stats = fs.statSync(dbFile);
    if (stats.size === 0) needsPush = true;
  }

  if (needsPush && fs.existsSync(schemaPath)) {
    const { execSync } = require('child_process');
    console.log('[SELF-BOOTSTRAP] Initializing database tables via prisma db push...');
    const pushEnv = { ...process.env, DATABASE_URL: `file:${dbFile}` };
    if (fs.existsSync(prismaCli)) {
      execSync(`"${process.execPath}" "${prismaCli}" db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
        cwd: __dirname,
        env: pushEnv,
        stdio: 'inherit'
      });
    } else {
      execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
        cwd: __dirname,
        env: pushEnv,
        stdio: 'inherit'
      });
    }
    // Also seed default admin & content
    const seedScript = path.join(prismaDir, 'seed.js');
    if (fs.existsSync(seedScript)) {
      try {
        const seedFn = require('./prisma/seed');
        if (typeof seedFn === 'function') seedFn();
      } catch (seedErr) {
        console.warn('[SELF-BOOTSTRAP SEED NOTE]', seedErr.message);
      }
    }
  }
} catch (dbErr) {
  console.warn('[SELF-BOOTSTRAP DB WARNING]', dbErr.message);
}

// 4. Delegate to express server
require('./src/server');
