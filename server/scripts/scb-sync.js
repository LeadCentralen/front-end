// Hämtar hela företagsregistret från SCB:s API (apiafr.scb.se) och importerar det: npm run scb-sync
// Kräver en personlig API-nyckel (registreraafr.scb.se) i miljövariabeln SCB_API_KEY.
// Endpoint, headernamn och sidindelning anges i server/config/scb.config.json (mall: scb.config.example.json).
// SCB tillåter max 5 000 rader per anrop och 5 anrop per sekund och nyckel. API:et är otillgängligt 04:00–04:30 UTC varje natt.
// Importen skriver över befintliga uppgifter (replace), eftersom SCB:s register är sanningen.
import fs from 'node:fs';
import { ImportService } from '../services/import/import.service.js';

const cfgFile = process.argv[2] || 'server/config/scb.config.json';
const key = process.env.SCB_API_KEY;
if (!key) { console.error('Sätt miljövariabeln SCB_API_KEY (personlig nyckel från SCB).'); process.exit(1); }
if (!fs.existsSync(cfgFile)) { console.error(`Hittar inte ${cfgFile}. Kopiera server/config/scb.config.example.json och fyll i.`); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
if (!/^https:\/\/apiafr\.scb\.se\//.test(cfg.url || '')) { console.error('url måste börja med https://apiafr.scb.se/'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dig = (obj, path) => (path ? path.split('.').reduce((o, k) => o?.[k], obj) : obj);
const delay = 1000 / Math.min(5, cfg.callsPerSecond || 4);

async function* pages() {
  const p = cfg.pagination || {};
  const size = p.size || 5000;
  let cursor = null;
  for (let i = 0; i < (cfg.maxPages || 1000); i++) {
    const url = new URL(cfg.url);
    for (const [k, v] of Object.entries(cfg.query || {})) url.searchParams.set(k, v);
    let body = cfg.body ? structuredClone(cfg.body) : undefined;
    if (p.type === 'cursor') {
      url.searchParams.set(p.sizeParam || 'limit', String(size));
      if (cursor != null) url.searchParams.set(p.cursorParam || 'cursorId', String(cursor));
    } else {
      const n = (p.firstPage ?? 1) + i;
      const val = p.type === 'offset' ? i * size : n;
      if (p.in === 'body' && body) {
        body[p.pageParam] = val;
        body[p.sizeParam] = size;
      } else {
        url.searchParams.set(p.pageParam, String(val));
        url.searchParams.set(p.sizeParam, String(size));
      }
    }
    const res = await fetch(url, {
      method: cfg.method || 'GET',
      headers: { [cfg.keyHeader || 'X-API-Key']: key, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      // SCB anger när blockeringen upphör ("blocked until 2026-11-18 09:00:17Z"); att knacka på tidigare förlänger den bara.
      const m = (await res.text()).match(/until (\d{4}-\d{2}-\d{2})[ T]([\d:]+Z)/);
      const wait = m ? Math.max(1000, Date.parse(`${m[1]}T${m[2]}`) - Date.now() + 1000) : 30000;
      console.warn(`För många anrop, väntar ${Math.ceil(wait / 1000)} s …`);
      await sleep(wait); i--; continue;
    }
    if (!res.ok) throw new Error(`SCB svarade ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const items = dig(data, cfg.itemsPath);
    if (!Array.isArray(items) || !items.length) return;
    console.log(`Sida ${i + 1}: ${items.length} rader`);
    yield* items;
    if (p.type === 'cursor') {
      const pagination = data.pagination;
      if (!pagination?.hasMore) return;
      cursor = pagination.nextCursorId;
      if (cursor == null) throw new Error('SCB svarade utan nextCursorId trots hasMore=true');
    } else if (items.length < size || !p.type) return;
    await sleep(delay);
  }
}
const stats = await ImportService.importRecords(pages(), { source: 'scb', replace: true });
console.log('Klart:', stats);
