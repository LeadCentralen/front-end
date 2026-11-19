import { all, one, run } from '../database/connection.js';
import { SECTIONS, SIZE_RANGES, STAGE_IDS, SECTION_LABELS, SIZE_OPTIONS, STATUSES, REVENUE_RANGES, REVENUE_OPTIONS } from '../config/constants.js';

const SORTS = {
  namn: 'c.name_norm ASC',
  namn_desc: 'c.name_norm DESC',
  anstallda: 'c.emp_min DESC, c.name_norm ASC',
  nyast: 'c.registered DESC, c.name_norm ASC',
  omsattning: 'c.revenue_min DESC, c.name_norm ASC',
  orgnr: 'c.orgnr ASC',
};
// Organisationens egen tavla (heltalet är kontrollerat, så det kan skrivas rakt in i satsen)
const joinLeads = (orgId) => `LEFT JOIN leads l ON l.orgnr = c.orgnr AND l.org_id = ${Math.floor(Number(orgId)) || 0}`;
// Enskilda firmors organisationsnummer är personnummer. Klienten får ett internt id ("id123") i stället.
const REF = "CASE WHEN c.legal_form LIKE 'Enskild%' THEN 'id' || c.rowid ELSE c.orgnr END";
const LIST_COLUMNS = `${REF} AS orgnr, c.name, c.legal_form, c.sni, c.sni_text, c.city, c.municipality, c.county, c.employees, c.revenue,
  c.phone, c.email, c.phone IS NOT NULL AS has_phone, c.email IS NOT NULL AS has_email, c.status, l.id AS lead_id, l.stage`;
const MAX = '￿'; // prefixsökning: kolumn BETWEEN prefix AND prefix + MAX
const has = (obj, key) => typeof key === 'string' && Object.hasOwn(obj, key); // skyddar mot t.ex. size=constructor
const sv = new Intl.Collator('sv');

// Bygger WHERE-sats och parametrar från sökfilter. Spärrade företag visas aldrig.
function buildWhere(q) {
  // Ett lead utan telefon och e-post går inte att kontakta, så de visas aldrig i sök.
  const where = ['c.suppressed=0', '(c.phone IS NOT NULL OR c.email IS NOT NULL)'];
  const p = [];
  const t = (q.q || '').trim().slice(0, 100);
  if (t) {
    let digits = t.replace(/[\s-]/g, '');
    if (digits.startsWith('+46')) digits = '0' + digits.slice(3);
    if (/^\d+$/.test(digits) && digits.length >= 3) {
      if (digits.length === 12) digits = digits.slice(2);
      // Personnummer (enskilda firmor) går inte att slå upp via sökrutan.
      // Telefonnummer matchas bara när nästan hela numret är angivet (annars kunde siffror läsas ut en i taget).
      if (digits.length >= 8) {
        where.push("((c.orgnr_plain BETWEEN ? AND ? AND c.legal_form NOT LIKE 'Enskild%') OR (c.phone_plain BETWEEN ? AND ?))");
        p.push(digits, digits + MAX, digits, digits + MAX);
      } else {
        where.push("(c.orgnr_plain BETWEEN ? AND ? AND c.legal_form NOT LIKE 'Enskild%')");
        p.push(digits, digits + MAX);
      }
    } else {
      const toks = t.split(/\s+/).map((x) => x.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean).slice(0, 6);
      if (toks.length) {
        where.push('c.rowid IN (SELECT rowid FROM companies_fts WHERE companies_fts MATCH ?)');
        p.push(toks.map((x) => `"${x}"*`).join(' '));
      }
    }
  }
  if (q.county) { where.push('c.county = ?'); p.push(q.county); }
  if (q.municipality) { where.push('c.municipality = ?'); p.push(q.municipality); }
  if (q.form) { where.push('c.legal_form = ?'); p.push(q.form); }
  if (has(SECTIONS, q.section)) {
    // Intervall mot indexet idx_c_sni (substr() tvingade fram en full tabellskanning)
    const [from, to] = SECTIONS[q.section];
    where.push('c.sni BETWEEN ? AND ?');
    p.push(String(from).padStart(2, '0'), String(to).padStart(2, '0') + MAX);
  }
  if (q.sni) {
    const s = q.sni.trim().slice(0, 60);
    const d = s.replace(/[\s.]/g, '');
    if (/^\d+$/.test(d)) { where.push('c.sni BETWEEN ? AND ?'); p.push(d, d + MAX); }
    else if (s) { where.push('c.sni_text LIKE ?'); p.push(`%${s.replace(/[%_]/g, '')}%`); }
  }
  if (has(SIZE_RANGES, q.size)) { where.push('c.emp_min BETWEEN ? AND ?'); p.push(...SIZE_RANGES[q.size]); }
  if (has(REVENUE_RANGES, q.revenue)) { where.push('c.revenue_min BETWEEN ? AND ?'); p.push(...REVENUE_RANGES[q.revenue]); }
  if (q.hasPhone === '1') where.push('c.phone IS NOT NULL');
  if (q.hasEmail === '1') where.push('c.email IS NOT NULL');
  const status = q.status === 'alla' || STATUSES.includes(q.status) ? q.status : 'Aktiv';
  if (status !== 'alla') { where.push('c.status = ?'); p.push(status); }
  let needsLeads = false;
  if (q.lead === 'none') { where.push('l.id IS NULL'); needsLeads = true; }
  else if (q.lead === 'any') { where.push('l.id IS NOT NULL'); needsLeads = true; }
  else if (STAGE_IDS.includes(q.lead)) { where.push('l.stage = ?'); p.push(q.lead); needsLeads = true; }
  return { where: where.join(' AND '), p, needsLeads };
}

// Ofullständig import (t.ex. CSV utan alla kolumner): fält som saknas behåller sitt gamla värde (COALESCE).
const UPSERT = `
INSERT INTO companies(orgnr,orgnr_plain,name,name_norm,legal_form,sni,sni_text,county,municipality,address,postcode,city,employees,emp_min,phone,phone_plain,email,website,status,registered,source,updated_at,revenue,revenue_min,revenue_year)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(orgnr) DO UPDATE SET
  name=excluded.name, name_norm=excluded.name_norm,
  legal_form=COALESCE(excluded.legal_form, legal_form),
  sni=COALESCE(excluded.sni, sni), sni_text=COALESCE(excluded.sni_text, sni_text),
  county=COALESCE(excluded.county, county), municipality=COALESCE(excluded.municipality, municipality),
  address=COALESCE(excluded.address, address), postcode=COALESCE(excluded.postcode, postcode),
  city=COALESCE(excluded.city, city), employees=COALESCE(excluded.employees, employees),
  emp_min=COALESCE(excluded.emp_min, emp_min),
  phone=COALESCE(excluded.phone, phone), phone_plain=COALESCE(excluded.phone_plain, phone_plain),
  email=COALESCE(excluded.email, email), website=COALESCE(excluded.website, website),
  status=excluded.status, registered=COALESCE(excluded.registered, registered),
  source=excluded.source, updated_at=excluded.updated_at,
  revenue=excluded.revenue, revenue_min=excluded.revenue_min, revenue_year=excluded.revenue_year`;

// Fullständig källa (SCB:s API): registret är sanningen, så även borttagna värden (t.ex. ett telefonnummer) ska försvinna.
const UPSERT_REPLACE = `
INSERT INTO companies(orgnr,orgnr_plain,name,name_norm,legal_form,sni,sni_text,county,municipality,address,postcode,city,employees,emp_min,phone,phone_plain,email,website,status,registered,source,updated_at,revenue,revenue_min,revenue_year)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(orgnr) DO UPDATE SET
  name=excluded.name, name_norm=excluded.name_norm, legal_form=excluded.legal_form,
  sni=excluded.sni, sni_text=excluded.sni_text, county=excluded.county, municipality=excluded.municipality,
  address=excluded.address, postcode=excluded.postcode, city=excluded.city,
  employees=excluded.employees, emp_min=excluded.emp_min,
  phone=excluded.phone, phone_plain=excluded.phone_plain, email=excluded.email,
  website=COALESCE(excluded.website, website), -- SCB:s API har ingen webbadress, så en importerad får inte nollas
  status=excluded.status, registered=excluded.registered,
  source=excluded.source, updated_at=excluded.updated_at,
  revenue=excluded.revenue, revenue_min=excluded.revenue_min, revenue_year=excluded.revenue_year`;

let facetCache = null;
const countCache = new Map(); // antal träffar per filterkombination (COUNT över 1,8 milj. rader tar ~0,5 s)
const COUNT_TTL = 10 * 60e3;

function countRows({ where, p, needsLeads }, orgId) {
  // Träffantalet beror på leadtavlan bara när leadfiltret används, så då cachas det aldrig.
  const sql = `SELECT COUNT(*) n FROM companies c ${needsLeads ? joinLeads(orgId) : ''} WHERE ${where}`;
  if (needsLeads) return one(sql, ...p).n;
  const key = sql + JSON.stringify(p);
  const hit = countCache.get(key);
  if (hit && Date.now() - hit.at < COUNT_TTL) return hit.n;
  const n = one(sql, ...p).n;
  if (countCache.size >= 200) countCache.clear();
  countCache.set(key, { n, at: Date.now() });
  return n;
}

export const CompanyModel = {
  // Kontaktuppgifter (telefon, e-post) visas bara för företag som ligger i organisationens tavla (reveal = alla, för plattformsadmin).
  search(filters, { page, pageSize, orgId, reveal = false }) {
    const w = buildWhere(filters);
    const order = SORTS[filters.sort] || SORTS.namn;
    const total = countRows(w, orgId);
    const rows = all(`SELECT ${LIST_COLUMNS} FROM companies c ${joinLeads(orgId)} WHERE ${w.where} ORDER BY ${order}, c.orgnr LIMIT ? OFFSET ?`, ...w.p, pageSize, (page - 1) * pageSize);
    return { total, rows: reveal ? rows : rows.map((r) => (r.lead_id ? r : { ...r, phone: null, email: null })) };
  },
  // Massinläggning i tavlan: företag som matchar filtret och ännu inte ligger i tavlan, i samma ordning som sökningen.
  bulkCounts(filters, orgId) {
    const { where, p } = buildWhere({ ...filters, lead: '' });
    const r = one(`SELECT COUNT(*) total, COALESCE(SUM(l.id IS NOT NULL), 0) inBoard FROM companies c ${joinLeads(orgId)} WHERE ${where}`, ...p);
    return { total: r.total, inBoard: r.inBoard };
  },
  bulkCandidates(filters, limit, orgId) {
    const { where, p } = buildWhere({ ...filters, lead: '' });
    return all(`SELECT c.orgnr FROM companies c ${joinLeads(orgId)} WHERE ${where} AND l.id IS NULL
                ORDER BY ${SORTS[filters.sort] || SORTS.namn}, c.orgnr LIMIT ?`, ...p, limit).map((r) => r.orgnr);
  },
  // Klientens id ("id123" eller organisationsnummer) -> riktigt organisationsnummer.
  resolveRef(ref) {
    const m = /^id(\d{1,12})$/.exec(String(ref || ''));
    return m ? one("SELECT orgnr FROM companies WHERE rowid=? AND legal_form LIKE 'Enskild%'", Number(m[1]))?.orgnr ?? null : ref;
  },
  // Returnerar bolaget med riktigt orgnr (för servern). Använd publicRef() för det som skickas till klienten.
  findActive(ref) {
    const orgnr = this.resolveRef(ref);
    const c = orgnr && one('SELECT rowid AS rid, * FROM companies WHERE orgnr=? AND suppressed=0', orgnr);
    if (c) { delete c.name_norm; delete c.orgnr_plain; delete c.phone_plain; }
    return c || undefined;
  },
  publicRef: (c) => (/^Enskild/.test(c.legal_form || '') ? 'id' + c.rid : c.orgnr),
  // Bara namnet på en juridisk person (aldrig enskild firma), för förifyllning vid registrering
  publicName: (orgnr) => one("SELECT name FROM companies WHERE orgnr=? AND suppressed=0 AND legal_form NOT LIKE 'Enskild%'", orgnr)?.name ?? null,
  existsActive: (orgnr) => !!one('SELECT 1 x FROM companies WHERE orgnr=? AND suppressed=0', orgnr),

  // En enda skanning av tabellen (tidigare tre) ger län, kommuner per län och bolagsformer.
  facets() {
    if (!facetCache) {
      const counties = new Set();
      const forms = new Set();
      const byCounty = {};
      for (const r of all('SELECT county, municipality, legal_form FROM companies WHERE suppressed=0 GROUP BY county, municipality, legal_form')) {
        if (r.county) counties.add(r.county);
        if (r.legal_form) forms.add(r.legal_form);
        if (r.county && r.municipality) (byCounty[r.county] ||= new Set()).add(r.municipality);
      }
      const municipalities = {};
      for (const [county, set] of Object.entries(byCounty)) municipalities[county] = [...set].sort(sv.compare);
      facetCache = {
        counties: [...counties].sort(sv.compare),
        forms: [...forms].sort(sv.compare),
        municipalities,
        sections: Object.entries(SECTION_LABELS).map(([id, label]) => ({ id, label })),
        sizes: SIZE_OPTIONS,
        revenues: REVENUE_OPTIONS,
      };
    }
    return facetCache;
  },
  clearFacetCache() { facetCache = null; countCache.clear(); },

  stats() {
    const r = one(`SELECT COUNT(*) companies, COALESCE(SUM(phone IS NOT NULL),0) withPhone, COALESCE(SUM(email IS NOT NULL),0) withEmail
                   FROM companies WHERE suppressed=0`);
    return { companies: r.companies, withPhone: r.withPhone, withEmail: r.withEmail, demo: one("SELECT COUNT(*) n FROM companies WHERE source='demo'").n };
  },
  countDemo: () => one("SELECT COUNT(*) n FROM companies WHERE source='demo'").n,
  deleteDemo: () => run("DELETE FROM companies WHERE source='demo'"),
  total: () => one('SELECT COUNT(*) n FROM companies').n,
  setSuppressed: (orgnr, flag) => run('UPDATE companies SET suppressed=? WHERE orgnr=?', flag ? 1 : 0, orgnr),

  upsert(c, source, ts, { replace = false } = {}) {
    run(replace ? UPSERT_REPLACE : UPSERT, c.orgnr, c.orgnr_plain, c.name, c.name_norm, c.legal_form, c.sni, c.sni_text, c.county, c.municipality,
      c.address, c.postcode, c.city, c.employees, c.emp_min, c.phone, c.phone_plain, c.email, c.website, c.status,
      c.registered, source, ts, c.revenue, c.revenue_min, c.revenue_year);
  },
};
