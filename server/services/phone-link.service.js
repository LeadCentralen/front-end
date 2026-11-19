import crypto from 'node:crypto';
import { HttpError } from '../core/http-error.js';
import { all, one, run, now } from '../database/connection.js';
import { rateLimit } from '../middleware/rate-limit.middleware.js';

// Telefonlänk: datorn skickar "ring det här numret" till användarens egen telefon (gratis, ingen telefontjänst).
// Telefonen öppnar sidan /telefon.html, kopplas en gång med en engångskod och hämtar sedan kommandon via long polling.
// Samtalet går i telefonen på användarens egen SIM. Läget hålls i minnet och försvinner vid omstart (det är kortlivat).
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const CODE_TTL = 5 * 60e3;
const ONLINE_MS = 45e3;
const POLL_MS = 25e3;

const codes = new Map();   // kod -> { userId, exp }
const calls = new Map();   // callId -> { userId, name, number, state, seconds, at }
const queue = new Map();   // userId -> [callId]
const waiters = new Map(); // phoneId -> { resolve }
const seen = new Map();    // phoneId -> senaste kontakt (ms)

function prune() {
  const t = Date.now();
  for (const [k, v] of codes) if (v.exp < t) codes.delete(k);
  for (const [k, v] of calls) if (t - v.at > 15 * 60e3) calls.delete(k);
}
const phonesOf = (userId) => all('SELECT id, name FROM phones WHERE user_id=?', userId);
const isOnlinePhone = (id) => Date.now() - (seen.get(id) || 0) < ONLINE_MS;

export const PhoneLink = {
  createCode(userId) {
    prune();
    for (const [k, v] of codes) if (v.userId === userId) codes.delete(k);
    const code = String(crypto.randomInt(100000, 1000000));
    codes.set(code, { userId, exp: Date.now() + CODE_TTL });
    return { code, expiresInSeconds: CODE_TTL / 1000 };
  },

  pair(code, name, ip) {
    rateLimit('pair:' + ip, 10, 15 * 60e3);
    prune();
    const key = String(code || '').trim();
    const hit = codes.get(key);
    if (!hit) throw new HttpError(400, 'Koden är fel eller har gått ut. Skapa en ny kod på datorn.');
    codes.delete(key);
    const token = crypto.randomBytes(32).toString('base64url');
    run('INSERT INTO phones(user_id, token_hash, name, created_at) VALUES (?,?,?,?)', hit.userId, sha(token), String(name || 'Telefon').slice(0, 60), now());
    return { token };
  },

  // Telefonens nyckel kommer i headern X-Phone-Token
  phoneFromReq(req) {
    const t = req.headers['x-phone-token'];
    const row = typeof t === 'string' && t.length > 20 ? one('SELECT id, user_id, name FROM phones WHERE token_hash=?', sha(t)) : null;
    if (!row) throw new HttpError(401, 'Telefonen är inte ansluten. Anslut den igen.');
    return row;
  },

  status(userId) {
    const list = phonesOf(userId);
    const online = list.filter((p) => isOnlinePhone(p.id));
    return { paired: list.length > 0, connected: online.length > 0, name: online[0]?.name || list[0]?.name || null };
  },

  unpair(userId) {
    for (const p of phonesOf(userId)) { waiters.get(p.id)?.resolve(null); seen.delete(p.id); }
    run('DELETE FROM phones WHERE user_id=?', userId);
  },

  dial(userId, name, number) {
    const n = String(number || '').replace(/[^\d+]/g, '');
    if (n.length < 5 || n.length > 20) throw new HttpError(400, 'Ogiltigt telefonnummer.');
    if (!PhoneLink.status(userId).connected) throw new HttpError(409, 'Ingen telefon är ansluten. Öppna Telefonlänk på telefonen.');
    prune();
    const id = crypto.randomUUID();
    calls.set(id, { userId, name: String(name || '').slice(0, 80), number: n, state: 'sent', seconds: 0, at: Date.now() });
    if (!queue.has(userId)) queue.set(userId, []);
    queue.get(userId).push(id);
    for (const p of phonesOf(userId)) waiters.get(p.id)?.resolve('wake');
    return { callId: id };
  },

  callStatus(userId, id) {
    const c = calls.get(id);
    if (!c || c.userId !== userId) throw new HttpError(404, 'Samtalet hittades inte.');
    return { state: c.state, seconds: c.seconds };
  },

  // Long poll: returnerar nästa samtal så fort det finns, annars tomt efter ~25 s.
  async poll(phone) {
    seen.set(phone.id, Date.now());
    const next = () => {
      const q = queue.get(phone.user_id) || [];
      while (q.length) {
        const id = q.shift();
        const c = calls.get(id);
        if (c && c.state === 'sent') return { callId: id, name: c.name, number: c.number };
      }
      return null;
    };
    let call = next();
    if (!call) {
      waiters.get(phone.id)?.resolve(null);
      await new Promise((resolve) => {
        const t = setTimeout(() => { waiters.delete(phone.id); resolve(null); }, POLL_MS);
        waiters.set(phone.id, { resolve: (v) => { clearTimeout(t); waiters.delete(phone.id); resolve(v); } });
      });
      call = next();
    }
    seen.set(phone.id, Date.now());
    return { call };
  },

  report(phone, callId, state, seconds) {
    const c = calls.get(callId);
    if (!c || c.userId !== phone.user_id) throw new HttpError(404, 'Samtalet hittades inte.');
    if (!['opened', 'returned'].includes(state)) throw new HttpError(400, 'Okänt läge.');
    c.state = state;
    if (state === 'returned') c.seconds = Math.max(0, Math.min(14400, Math.round(Number(seconds) || 0)));
    return { ok: true };
  },
};
