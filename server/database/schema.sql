-- Leadcentralens databasschema (SQLite). Körs vid start; alla satser är idempotenta.
-- Organisationer (kunder). Användare och leads tillhör en organisation, företagsregistret delas av alla.
CREATE TABLE IF NOT EXISTS orgs (
  id INTEGER PRIMARY KEY,
  orgnr TEXT UNIQUE,
  name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  seats INTEGER NOT NULL DEFAULT 1,
  plan TEXT NOT NULL DEFAULT 'start',
  trial_ends_at TEXT,
  created_at TEXT NOT NULL
);
-- Företag som lagts i tavlan per organisation och vecka (måndag som nyckel). Raderade leads ger inte tillbaka kvoten.
CREATE TABLE IF NOT EXISTS org_weekly (
  org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  week TEXT NOT NULL,
  leads INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, week)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS companies (
  orgnr TEXT PRIMARY KEY,
  orgnr_plain TEXT NOT NULL,
  name TEXT NOT NULL,
  name_norm TEXT NOT NULL,
  legal_form TEXT,
  sni TEXT,
  sni_text TEXT,
  county TEXT,
  municipality TEXT,
  address TEXT,
  postcode TEXT,
  city TEXT,
  employees TEXT,
  emp_min INTEGER,
  phone TEXT,
  phone_plain TEXT,
  email TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'Aktiv',
  registered TEXT,
  source TEXT,
  updated_at TEXT,
  suppressed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_c_orgplain ON companies(orgnr_plain);
CREATE INDEX IF NOT EXISTS idx_c_phoneplain ON companies(phone_plain);
CREATE INDEX IF NOT EXISTS idx_c_name ON companies(name_norm);
CREATE INDEX IF NOT EXISTS idx_c_sni ON companies(sni);
CREATE INDEX IF NOT EXISTS idx_c_county ON companies(county);
CREATE INDEX IF NOT EXISTS idx_c_muni ON companies(municipality);
CREATE INDEX IF NOT EXISTS idx_c_form ON companies(legal_form);
CREATE INDEX IF NOT EXISTS idx_c_emp ON companies(emp_min);
CREATE INDEX IF NOT EXISTS idx_c_source ON companies(source);

CREATE VIRTUAL TABLE IF NOT EXISTS companies_fts USING fts5(
  name, orgnr_plain, city, content='companies', content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS companies_ai AFTER INSERT ON companies BEGIN
  INSERT INTO companies_fts(rowid, name, orgnr_plain, city) VALUES (new.rowid, new.name, new.orgnr_plain, new.city);
END;
CREATE TRIGGER IF NOT EXISTS companies_ad AFTER DELETE ON companies BEGIN
  INSERT INTO companies_fts(companies_fts, rowid, name, orgnr_plain, city) VALUES ('delete', old.rowid, old.name, old.orgnr_plain, old.city);
END;
CREATE TRIGGER IF NOT EXISTS companies_au AFTER UPDATE ON companies BEGIN
  INSERT INTO companies_fts(companies_fts, rowid, name, orgnr_plain, city) VALUES ('delete', old.rowid, old.name, old.orgnr_plain, old.city);
  INSERT INTO companies_fts(rowid, name, orgnr_plain, city) VALUES (new.rowid, new.name, new.orgnr_plain, new.city);
END;

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  orgnr TEXT NOT NULL REFERENCES companies(orgnr) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'ny',
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  value INTEGER,
  next_step TEXT,
  next_date TEXT,
  position REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  group_name TEXT,
  UNIQUE (org_id, orgnr)
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  text TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_act_lead ON activities(lead_id, created_at);
CREATE TABLE IF NOT EXISTS suppression (
  orgnr TEXT PRIMARY KEY,
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS removal_requests (
  id INTEGER PRIMARY KEY,
  orgnr TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL,
  handled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

-- Skrapningsskydd: hur mycket varje användare hämtat per dygn
CREATE TABLE IF NOT EXISTS usage_daily (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  rows_seen INTEGER NOT NULL DEFAULT 0,
  details INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS seen_daily (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  ref TEXT NOT NULL,
  PRIMARY KEY (user_id, day, ref)
) WITHOUT ROWID;

-- Anslutna telefoner (Telefonlänk). Telefonen loggar inte in utan får en egen nyckel (sparas hashad).
CREATE TABLE IF NOT EXISTS phones (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL
);
