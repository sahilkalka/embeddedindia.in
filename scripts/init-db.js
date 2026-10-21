// scripts/init-db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const prismaDir = path.resolve(__dirname, '../prisma');
if (!fs.existsSync(prismaDir)) fs.mkdirSync(prismaDir, { recursive: true });

const dbPath = path.join(prismaDir, 'dev.db');
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Post (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'Embedded Electronics',
  tags TEXT DEFAULT 'embedded,firmware,hardware',
  summary TEXT NOT NULL,
  contentMarkdown TEXT NOT NULL,
  contentHtml TEXT NOT NULL,
  coverImage TEXT,
  author TEXT DEFAULT 'Embedded India Team',
  status TEXT DEFAULT 'published',
  scheduledAt DATETIME,
  publishedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  views INTEGER DEFAULT 0,
  readingTime INTEGER DEFAULT 3,
  seoTitle TEXT,
  seoDescription TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Inquiry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  serviceCategory TEXT DEFAULT 'General',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  ipAddress TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Subscriber (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  verifyToken TEXT UNIQUE,
  verifiedAt DATETIME,
  leadMagnetSent INTEGER DEFAULT 0,
  source TEXT DEFAULT 'website',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Setting (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Analytics (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  userAgent TEXT,
  ipHash TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS CalculatorStat (
  id TEXT PRIMARY KEY,
  toolName TEXT NOT NULL,
  executionCount INTEGER DEFAULT 0,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

console.log('Database initialized at:', dbPath);
module.exports = db;
