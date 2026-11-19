import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
export const db = new DatabaseSync(config.dbPath);
// busy_timeout: låter en import (npm run scb-sync) skriva samtidigt som servern körs utan "database is locked".
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
db.exec(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8'));

// Förberedda satser cachas per SQL-sträng
const stmts = new Map();
function prep(sql) {
  let s = stmts.get(sql);
  if (!s) {
    if (stmts.size > 300) stmts.clear();
    s = db.prepare(sql);
    stmts.set(sql, s);
  }
  return s;
}
const clean = (a) => a.map((v) => (v === undefined ? null : v));
export const all = (sql, ...p) => prep(sql).all(...clean(p));
export const one = (sql, ...p) => prep(sql).get(...clean(p)) ?? null;
export const run = (sql, ...p) => prep(sql).run(...clean(p));
export const now = () => new Date().toISOString();

export function tx(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Lättviktig migrering: kolumner som tillkommit efter första versionen läggs till på befintliga databaser.
const cols = new Set(db.prepare('PRAGMA table_info(companies)').all().map((c) => c.name));
for (const [name, type] of [['revenue', 'TEXT'], ['revenue_min', 'INTEGER'], ['revenue_year', 'INTEGER']]) {
  if (!cols.has(name)) db.exec(`ALTER TABLE companies ADD COLUMN ${name} ${type}`);
}
db.exec('CREATE INDEX IF NOT EXISTS idx_c_rev ON companies(revenue_min)');
const addCols = (table, list) => {
  const have = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [name, type] of list) if (!have.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
};
addCols('sessions', [['last_seen', 'INTEGER']]);
addCols('leads', [['group_name', 'TEXT']]);
addCols('activities', [['outcome', 'TEXT'], ['seconds', 'INTEGER']]);
db.exec('CREATE INDEX IF NOT EXISTS idx_act_call ON activities(type, created_at)');
addCols('users', [['org_id', 'INTEGER REFERENCES orgs(id)'], ['violations', 'INTEGER NOT NULL DEFAULT 0'], ['last_violation_at', 'TEXT'], ['suspended_at', 'TEXT']]);

// Organisationer: befintliga användare och leads flyttas till en första organisation, och leads får en egen
// unik nyckel per organisation (samma företag kan ligga i flera organisationers tavlor).
{
  addCols('orgs', [['plan', "TEXT NOT NULL DEFAULT 'start'"], ['trial_ends_at', 'TEXT']]);
  const firstOrg = () => {
    const have = db.prepare('SELECT id FROM orgs ORDER BY id LIMIT 1').get();
    if (have) return have.id;
    const r = db.prepare("INSERT INTO orgs(name, seats, plan, created_at) VALUES (?,?,'enterprise',?)").run(config.controller.name || 'Min organisation', 1000, new Date().toISOString());
    return Number(r.lastInsertRowid);
  };
  if (db.prepare('SELECT COUNT(*) n FROM users WHERE org_id IS NULL').get().n > 0) {
    db.prepare('UPDATE users SET org_id=? WHERE org_id IS NULL').run(firstOrg());
  }
  const leadCols = db.prepare('PRAGMA table_info(leads)').all().map((c) => c.name);
  if (!leadCols.includes('org_id')) {
    const orgId = firstOrg();
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      db.exec(`CREATE TABLE leads_new (
        id INTEGER PRIMARY KEY,
        org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        orgnr TEXT NOT NULL REFERENCES companies(orgnr) ON DELETE CASCADE,
        stage TEXT NOT NULL DEFAULT 'ny',
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        value INTEGER, next_step TEXT, next_date TEXT,
        position REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        group_name TEXT,
        UNIQUE (org_id, orgnr))`);
      db.prepare(`INSERT INTO leads_new (id, org_id, orgnr, stage, owner_id, value, next_step, next_date, position, created_at, updated_at, group_name)
                  SELECT id, ?, orgnr, stage, owner_id, value, next_step, next_date, position, created_at, updated_at, group_name FROM leads`).run(orgId);
      db.exec('DROP TABLE leads');
      db.exec('ALTER TABLE leads_new RENAME TO leads');
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; } finally { db.exec('PRAGMA foreign_keys = ON'); }
  }
  db.exec("UPDATE orgs SET plan='enterprise' WHERE orgnr IS NULL"); // plattformens egen organisation är alltid obegränsad
  db.exec('CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(org_id, stage, position)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id)');
}
