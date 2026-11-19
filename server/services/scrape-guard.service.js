import { HttpError } from '../core/http-error.js';
import { one, run } from '../database/connection.js';
import { rateLimit } from '../middleware/rate-limit.middleware.js';
import { AuditLogModel } from '../models/audit-log.model.js';

// Skydd mot att hämta ut registret. Tre lager:
//  1. Takt: högst N anrop per minut och användare (och per IP).
//  2. Djup: en sökning visar aldrig mer än MAX_DEPTH rader. För att se fler måste man smalna av filtret.
//  3. Dygnskvot: antal visade rader, öppnade företag och tillagda leads per användare och dygn.
// Överskridna kvoter loggas (audit: scrape_block) så att ni ser vem det gäller. Admin undantas från dygnskvoterna.
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const env = process.env;
export const LIMITS = {
  maxDepth: num(env.LIMIT_DEPTH, 500),         // rader per sökning
  rowsPerDay: num(env.LIMIT_ROWS_DAY, 3000),   // olika företag som visas i listor per dygn
  detailsPerDay: num(env.LIMIT_DETAILS_DAY, 300), // öppnade företagskort
  leadsPerDay: num(env.LIMIT_LEADS_DAY, 100),  // leads som läggs i tavlan
  searchPerMin: num(env.LIMIT_SEARCH_MIN, 40),
  detailPerMin: num(env.LIMIT_DETAIL_MIN, 30),
};
const COLUMN = { rows: 'rows_seen', details: 'details', leads: 'leads' };
const QUOTA = { rows: 'rowsPerDay', details: 'detailsPerDay', leads: 'leadsPerDay' };
const LABEL = { rows: 'visade företag', details: 'öppnade företag', leads: 'tillagda leads' };
let purgedDay = '';
const today = () => new Date().toISOString().slice(0, 10);

function quota(user, kind, n) {
  if (user.role === 'admin') return;
  const col = COLUMN[kind];
  const day = today();
  run('INSERT INTO usage_daily(user_id, day) VALUES (?, ?) ON CONFLICT DO NOTHING', user.id, day);
  const cur = one(`SELECT ${col} n, blocked FROM usage_daily WHERE user_id=? AND day=?`, user.id, day);
  const max = Math.floor(LIMITS[QUOTA[kind]] / (user.trial_ends_at ? 2 : 1)); // provkonton får hälften
  if (cur.n + n > max) {
    if (!cur.blocked) {
      run('UPDATE usage_daily SET blocked=1 WHERE user_id=? AND day=?', user.id, day);
      AuditLogModel.record(user.id, 'scrape_block', `${kind}: ${cur.n} av ${max} per dygn`);
    }
    throw new HttpError(429, `Du har nått dagens gräns för ${LABEL[kind]}. Gränsen nollställs vid midnatt. Hör av dig till oss om du behöver mer.`);
  }
  run(`UPDATE usage_daily SET ${col}=${col}+? WHERE user_id=? AND day=?`, n, user.id, day);
}

export const ScrapeGuard = {
  // Anropas före en sökning. Returnerar tillåten sidstorlek och sista tillåtna sida.
  beforeSearch(ctx, page, pageSize) {
    rateLimit('s:u' + ctx.user.id, LIMITS.searchPerMin, 60e3);
    rateLimit('s:ip' + ctx.ip, LIMITS.searchPerMin * 3, 60e3);
    const maxPage = Math.max(1, Math.floor(LIMITS.maxDepth / pageSize));
    if (page > maxPage) throw new HttpError(400, `Sökningen visar högst ${LIMITS.maxDepth} företag. Smalna av med filter för att se fler.`);
    return { maxPage };
  },
  // Räknar bara företag som användaren inte redan sett i dag, så vanlig filtrering och bläddring förbrukar lite.
  afterSearch(ctx, rows) {
    if (ctx.user.role === 'admin') return;
    const day = today();
    if (purgedDay !== day) { run('DELETE FROM seen_daily WHERE day < ?', day); purgedDay = day; }
    let fresh = 0;
    for (const r of rows) fresh += Number(run('INSERT OR IGNORE INTO seen_daily(user_id, day, ref) VALUES (?,?,?)', ctx.user.id, day, r.orgnr).changes);
    if (fresh) quota(ctx.user, 'rows', fresh);
  },
  beforeDetail(ctx) {
    rateLimit('d:u' + ctx.user.id, LIMITS.detailPerMin, 60e3);
    quota(ctx.user, 'details', 1);
  },
  beforeLead: (user) => quota(user, 'leads', 1),
  beforeLeads: (user, n) => quota(user, 'leads', n),
  // Hur många leads användaren får lägga till resten av dygnet (null = obegränsat för admin)
  leadsLeft(user) {
    if (user.role === 'admin') return null;
    const row = one('SELECT leads FROM usage_daily WHERE user_id=? AND day=?', user.id, today());
    return Math.max(0, LIMITS.leadsPerDay - (row?.leads || 0));
  },
};
