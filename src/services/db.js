// src/services/db.js
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const defaultDbPath = path.resolve(__dirname, '../../prisma/dev.db');
const prismaDir = path.dirname(defaultDbPath);
if (!fs.existsSync(prismaDir)) {
  fs.mkdirSync(prismaDir, { recursive: true });
}

let sqliteDb;
function getSqliteDb() {
  if (!sqliteDb) {
    sqliteDb = new Database(defaultDbPath);
    sqliteDb.pragma('journal_mode = WAL');
  }
  return sqliteDb;
}

// Helper to filter columns based on select options
function applySelect(row, select) {
  if (!row || !select || typeof select !== 'object') return row;
  const filtered = {};
  for (const [key, val] of Object.entries(select)) {
    if (val && key in row) {
      filtered[key] = row[key];
    }
  }
  return filtered;
}

// Convert SQLite row values (like integer booleans or ISO dates) to standard JS types
function normalizeRow(row) {
  if (!row) return row;
  const res = { ...row };
  if ('leadMagnetSent' in res) {
    res.leadMagnetSent = Boolean(res.leadMagnetSent);
  }
  if ('featured' in res) {
    res.featured = Boolean(res.featured);
  }
  if (res.createdAt && typeof res.createdAt === 'string') {
    res.createdAt = new Date(res.createdAt);
  }
  if (res.updatedAt && typeof res.updatedAt === 'string') {
    res.updatedAt = new Date(res.updatedAt);
  }
  if (res.publishedAt && typeof res.publishedAt === 'string') {
    res.publishedAt = new Date(res.publishedAt);
  }
  if (res.scheduledAt && typeof res.scheduledAt === 'string') {
    res.scheduledAt = new Date(res.scheduledAt);
  }
  if (res.verifiedAt && typeof res.verifiedAt === 'string') {
    res.verifiedAt = new Date(res.verifiedAt);
  }
  if (res.timestamp && typeof res.timestamp === 'string') {
    res.timestamp = new Date(res.timestamp);
  }
  return res;
}

// Build SQL WHERE clause from Prisma query object
function buildWhereClause(where) {
  if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
    return { clause: '', params: [] };
  }

  const parts = [];
  const params = [];

  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(val)) {
      const orParts = [];
      for (const condition of val) {
        const sub = buildWhereClause(condition);
        if (sub.clause) {
          orParts.push(sub.clause.replace(/^WHERE\s+/, ''));
          params.push(...sub.params);
        }
      }
      if (orParts.length > 0) {
        parts.push(`(${orParts.join(' OR ')})`);
      }
    } else if (key === 'AND' && Array.isArray(val)) {
      const andParts = [];
      for (const condition of val) {
        const sub = buildWhereClause(condition);
        if (sub.clause) {
          andParts.push(sub.clause.replace(/^WHERE\s+/, ''));
          params.push(...sub.params);
        }
      }
      if (andParts.length > 0) {
        parts.push(`(${andParts.join(' AND ')})`);
      }
    } else if (val === null) {
      parts.push(`\`${key}\` IS NULL`);
    } else if (typeof val === 'object' && !(val instanceof Date)) {
      if ('contains' in val) {
        parts.push(`\`${key}\` LIKE ?`);
        params.push(`%${val.contains}%`);
      } else if ('gt' in val) {
        parts.push(`\`${key}\` > ?`);
        params.push(val.gt instanceof Date ? val.gt.toISOString() : val.gt);
      } else if ('gte' in val) {
        parts.push(`\`${key}\` >= ?`);
        params.push(val.gte instanceof Date ? val.gte.toISOString() : val.gte);
      } else if ('lt' in val) {
        parts.push(`\`${key}\` < ?`);
        params.push(val.lt instanceof Date ? val.lt.toISOString() : val.lt);
      } else if ('lte' in val) {
        parts.push(`\`${key}\` <= ?`);
        params.push(val.lte instanceof Date ? val.lte.toISOString() : val.lte);
      } else if ('not' in val) {
        if (val.not === null) {
          parts.push(`\`${key}\` IS NOT NULL`);
        } else {
          parts.push(`\`${key}\` != ?`);
          params.push(val.not);
        }
      } else if ('in' in val && Array.isArray(val.in)) {
        if (val.in.length === 0) {
          parts.push('1 = 0');
        } else {
          const placeholders = val.in.map(() => '?').join(', ');
          parts.push(`\`${key}\` IN (${placeholders})`);
          params.push(...val.in);
        }
      }
    } else {
      parts.push(`\`${key}\` = ?`);
      params.push(val instanceof Date ? val.toISOString() : val);
    }
  }

  return {
    clause: parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '',
    params
  };
}

function createModelHandler(tableName) {
  return {
    async findUnique(options = {}) {
      const db = getSqliteDb();
      const { where, select } = options;
      const { clause, params } = buildWhereClause(where);
      if (!clause) return null;
      const row = db.prepare(`SELECT * FROM \`${tableName}\` ${clause} LIMIT 1`).get(...params);
      if (!row) return null;
      return applySelect(normalizeRow(row), select);
    },

    async findFirst(options = {}) {
      const db = getSqliteDb();
      const { where, orderBy, select } = options;
      const { clause, params } = buildWhereClause(where);
      let sql = `SELECT * FROM \`${tableName}\` ${clause}`;
      if (orderBy) {
        const orderCols = Array.isArray(orderBy) ? orderBy : [orderBy];
        const orderParts = orderCols.map(o => {
          const [col, dir] = Object.entries(o)[0];
          return `\`${col}\` ${dir.toUpperCase()}`;
        });
        sql += ` ORDER BY ${orderParts.join(', ')}`;
      }
      sql += ' LIMIT 1';
      const row = db.prepare(sql).get(...params);
      if (!row) return null;
      return applySelect(normalizeRow(row), select);
    },

    async findMany(options = {}) {
      const db = getSqliteDb();
      const { where, orderBy, take, skip, select } = options;
      const { clause, params } = buildWhereClause(where);
      let sql = `SELECT * FROM \`${tableName}\` ${clause}`;

      if (orderBy) {
        const orderCols = Array.isArray(orderBy) ? orderBy : [orderBy];
        const orderParts = orderCols.map(o => {
          const [col, dir] = Object.entries(o)[0];
          return `\`${col}\` ${dir.toUpperCase()}`;
        });
        sql += ` ORDER BY ${orderParts.join(', ')}`;
      }

      if (take !== undefined) {
        sql += ` LIMIT ${Number(take)}`;
        if (skip !== undefined) {
          sql += ` OFFSET ${Number(skip)}`;
        }
      } else if (skip !== undefined) {
        sql += ` LIMIT -1 OFFSET ${Number(skip)}`;
      }

      const rows = db.prepare(sql).all(...params);
      return rows.map(r => applySelect(normalizeRow(r), select));
    },

    async count(options = {}) {
      const db = getSqliteDb();
      const { where } = options;
      const { clause, params } = buildWhereClause(where);
      const sql = `SELECT COUNT(*) as count FROM \`${tableName}\` ${clause}`;
      const res = db.prepare(sql).get(...params);
      return res ? Number(res.count) : 0;
    },

    async create(options = {}) {
      const db = getSqliteDb();
      const { data, select } = options;
      const record = { ...data };
      if (!record.id) {
        record.id = crypto.randomUUID();
      }
      const now = new Date().toISOString();
      if ('createdAt' in record && record.createdAt instanceof Date) {
        record.createdAt = record.createdAt.toISOString();
      } else if (!record.createdAt) {
        record.createdAt = now;
      }
      if ('updatedAt' in record && record.updatedAt instanceof Date) {
        record.updatedAt = record.updatedAt.toISOString();
      } else if (!record.updatedAt) {
        record.updatedAt = now;
      }
      if ('publishedAt' in record && record.publishedAt instanceof Date) {
        record.publishedAt = record.publishedAt.toISOString();
      }
      if ('scheduledAt' in record && record.scheduledAt instanceof Date) {
        record.scheduledAt = record.scheduledAt.toISOString();
      }
      if ('verifiedAt' in record && record.verifiedAt instanceof Date) {
        record.verifiedAt = record.verifiedAt.toISOString();
      }
      if ('leadMagnetSent' in record) {
        record.leadMagnetSent = record.leadMagnetSent ? 1 : 0;
      }

      const cols = Object.keys(record);
      const placeholders = cols.map(() => '?').join(', ');
      const values = cols.map(c => record[c]);

      const sql = `INSERT INTO \`${tableName}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
      db.prepare(sql).run(...values);

      const inserted = db.prepare(`SELECT * FROM \`${tableName}\` WHERE id = ?`).get(record.id);
      return applySelect(normalizeRow(inserted), select);
    },

    async update(options = {}) {
      const db = getSqliteDb();
      const { where, data, select } = options;
      const { clause, params: whereParams } = buildWhereClause(where);
      if (!clause) throw new Error('Update requires a where clause');

      const updateData = { ...data };
      const setParts = [];
      const setParams = [];

      if (!('updatedAt' in updateData)) {
        updateData.updatedAt = new Date().toISOString();
      }

      for (const [key, val] of Object.entries(updateData)) {
        if (val && typeof val === 'object' && 'increment' in val) {
          setParts.push(`\`${key}\` = \`${key}\` + ?`);
          setParams.push(val.increment);
        } else if (val instanceof Date) {
          setParts.push(`\`${key}\` = ?`);
          setParams.push(val.toISOString());
        } else if (typeof val === 'boolean') {
          setParts.push(`\`${key}\` = ?`);
          setParams.push(val ? 1 : 0);
        } else {
          setParts.push(`\`${key}\` = ?`);
          setParams.push(val);
        }
      }

      const sql = `UPDATE \`${tableName}\` SET ${setParts.join(', ')} ${clause}`;
      db.prepare(sql).run(...setParams, ...whereParams);

      const row = db.prepare(`SELECT * FROM \`${tableName}\` ${clause} LIMIT 1`).get(...whereParams);
      return applySelect(normalizeRow(row), select);
    },

    async updateMany(options = {}) {
      const db = getSqliteDb();
      const { where, data } = options;
      const { clause, params: whereParams } = buildWhereClause(where);
      const updateData = { ...data };
      const setParts = [];
      const setParams = [];

      for (const [key, val] of Object.entries(updateData)) {
        if (val instanceof Date) {
          setParts.push(`\`${key}\` = ?`);
          setParams.push(val.toISOString());
        } else if (typeof val === 'boolean') {
          setParts.push(`\`${key}\` = ?`);
          setParams.push(val ? 1 : 0);
        } else {
          setParts.push(`\`${key}\` = ?`);
          setParams.push(val);
        }
      }

      const sql = `UPDATE \`${tableName}\` SET ${setParts.join(', ')} ${clause}`;
      const result = db.prepare(sql).run(...setParams, ...whereParams);
      return { count: result.changes };
    },

    async upsert(options = {}) {
      const { where, update, create, select } = options;
      const existing = await this.findFirst({ where });
      if (existing) {
        return this.update({ where: { id: existing.id }, data: update, select });
      } else {
        const createData = { ...where, ...create };
        return this.create({ data: createData, select });
      }
    },

    async delete(options = {}) {
      const db = getSqliteDb();
      const { where, select } = options;
      const { clause, params } = buildWhereClause(where);
      if (!clause) throw new Error('Delete requires a where clause');

      const existing = db.prepare(`SELECT * FROM \`${tableName}\` ${clause} LIMIT 1`).get(...params);
      db.prepare(`DELETE FROM \`${tableName}\` ${clause}`).run(...params);
      return applySelect(normalizeRow(existing), select);
    },

    async deleteMany(options = {}) {
      const db = getSqliteDb();
      const { where } = options;
      const { clause, params } = buildWhereClause(where);
      const result = db.prepare(`DELETE FROM \`${tableName}\` ${clause}`).run(...params);
      return { count: result.changes };
    }
  };
}

const sqlitePrisma = {
  user: createModelHandler('User'),
  post: createModelHandler('Post'),
  project: createModelHandler('Project'),
  inquiry: createModelHandler('Inquiry'),
  subscriber: createModelHandler('Subscriber'),
  setting: createModelHandler('Setting'),
  analytics: createModelHandler('Analytics'),
  calculatorStat: createModelHandler('CalculatorStat'),
  testimonial: createModelHandler('Testimonial'),

  async $disconnect() {
    if (sqliteDb) {
      sqliteDb.close();
      sqliteDb = null;
    }
  },

  async $connect() {
    getSqliteDb();
  }
};

function hasNativeEngine() {
  try {
    const clientDir = path.resolve(__dirname, '../../node_modules/.prisma/client');
    if (fs.existsSync(clientDir)) {
      const files = fs.readdirSync(clientDir);
      for (const f of files) {
        if (f.includes('query_engine') && (f.endsWith('.node') || f.endsWith('.so.node'))) {
          const size = fs.statSync(path.join(clientDir, f)).size;
          if (size > 1000000) return true;
        }
      }
    }
  } catch (e) {}
  return false;
}

let activeClient = sqlitePrisma;

if (hasNativeEngine()) {
  try {
    const { PrismaClient } = require('@prisma/client');
    activeClient = new PrismaClient({
      datasources: {
        db: { url: `file:${defaultDbPath}` }
      },
      log: ['error']
    });
  } catch (e) {
    activeClient = sqlitePrisma;
  }
}

// Install on startup as well, so restarting an existing installation protects it.
const guardDb = getSqliteDb();
if (guardDb.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='Post'").get()) {
  require('./postDuplicates').installPostDuplicateGuards(guardDb);
}
module.exports = activeClient;
