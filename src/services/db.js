// src/services/db.js
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Always resolve SQLite path absolutely to prevent Passenger/cPanel working-directory mismatches
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
