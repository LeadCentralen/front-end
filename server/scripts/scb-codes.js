// Hämtar SCB:s kodtabeller (bolagsform, kommun, län, storleksklass, status, SNI) och sparar dem i
// server/config/scb-codes.json. Mappern använder filen för att översätta koder till klartext.
// Körs vid behov (koderna ändras sällan): SCB_API_KEY=… npm run scb-codes
import fs from 'node:fs';

const key = process.env.SCB_API_KEY;
if (!key) { console.error('Sätt miljövariabeln SCB_API_KEY (finns i .env).'); process.exit(1); }

const BASE = 'https://apiafr.scb.se/v1/kodtabeller/';
const TABLES = { jurform: 'jurformkoder', kommun: 'kommunkoder', lan: 'lankoder', anstkl: 'anstklkoder', ftgstat: 'ftgstatkoder', sni: 'naringsgrenkoder', omskl: 'omsklkoder' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchTable(name) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(BASE + name, { headers: { 'X-API-Key': key, Accept: 'application/json' } });
    if (res.status === 429) {
      // SCB skriver t.ex. "blocked until 2026-11-18 09:00:17Z"
      const m = (await res.text()).match(/until (\d{4}-\d{2}-\d{2})[ T]([\d:]+Z)/);
      const wait = m ? Math.max(1000, Date.parse(`${m[1]}T${m[2]}`) - Date.now() + 1000) : 30000;
      console.warn(`Rate limit, väntar ${Math.ceil(wait / 1000)} s …`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${name}: SCB svarade ${res.status}`);
    return res.json();
  }
  throw new Error(`${name}: gav upp efter upprepade 429`);
}

const out = { _info: 'Genererad av npm run scb-codes från SCB:s kodtabeller. Redigera inte för hand.', fetched: new Date().toISOString() };
for (const [field, table] of Object.entries(TABLES)) {
  const rows = await fetchTable(table);
  out[field] = Object.fromEntries(rows.map((r) => [String(r.kod), String(r.klartext).trim()]));
  console.log(`${table}: ${rows.length} koder`);
  await sleep(1000); // max 5 anrop/s tillåts; vi tar det lugnt
}
const file = new URL('../config/scb-codes.json', import.meta.url);
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
console.log('Sparade', file.pathname);
