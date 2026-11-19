// Översätter en rå post till företagsmodellens fält. Två vägar in:
//  1. SCB:s API (jeFullData: peOrgNr, jurform, anstKl, naringsgrenar …) → scbApiFields(), exakt fältmappning.
//  2. Filer (CSV/JSON från SCB:s söktjänst m.fl.) → kolumnrubriker känns igen flexibelt via ALIASES.
// Därefter normaliseras och koder översätts till klartext med SCB:s kodtabeller (config/scb-codes.json).
import fs from 'node:fs';
import { LAN_CODES } from '../../config/constants.js';

function loadCodes() {
  try { return JSON.parse(fs.readFileSync(new URL('../../config/scb-codes.json', import.meta.url), 'utf8')); }
  catch { return {}; } // filen skapas av `npm run scb-codes`; utan den lämnas koder orörda
}
const CODES = loadCodes();

// SCB:s egna klartexter är ibland tekniska; dessa är de benämningar användaren känner igen.
const FORM_LABELS = { 10: 'Enskild firma', 49: 'Aktiebolag', 31: 'Handelsbolag/kommanditbolag' };

const fold = (s) =>
  String(s).toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]/g, '');

const ALIASES = {
  orgnr: ['orgnr', 'organisationsnummer', 'peorgnr', 'orgnummer', 'organisationsnr', 'orgnr10', 'identitet'],
  name: ['namn', 'foretagsnamn', 'foretag', 'benamning', 'firmanamn', 'foretagsnamnkort', 'companyname', 'name'],
  legal_form: ['juridiskformtext', 'juridiskform', 'bolagsform', 'jutext', 'legalform', 'foretagsform', 'jurform'],
  sni: ['snikod', 'sni', 'sni1', 'snikod1', 'sni2025', 'sni2007', 'bransch', 'snikodhuvud', 'snikodfk', 'avdelningskod'],
  sni_text: ['snitext', 'snibenamning', 'branschtext', 'snikodtext', 'sni1text', 'snikod1text', 'snibeskrivning', 'naringsgren'],
  county: ['lan', 'lanstext', 'lansnamn', 'lanbenamning', 'lankod', 'lansate', 'county'],
  municipality: ['kommun', 'kommuntext', 'kommunnamn', 'kommunbenamning', 'kommunsate', 'kommunkod', 'municipality'],
  address: ['gatuadress', 'adress', 'utdelningsadress', 'besoksadress', 'postadress', 'gatuadress1', 'address'],
  postcode: ['postnr', 'postnummer', 'postcode', 'zip'],
  city: ['postort', 'ort', 'postadressort', 'city'],
  employees: ['storleksklass', 'storleksklassanstallda', 'antalanstallda', 'anstallda', 'stkl', 'storleksklasstext', 'employees'],
  emp_class: ['anstkl', 'anstklkod'], // SCB:s storleksklasskod (0–16), översätts via kodtabellen
  phone: ['telefon', 'tel', 'telefonnummer', 'telefonnr', 'tillaggsgrupptel', 'phone', 'mobil'],
  email: ['epost', 'epostadress', 'email', 'mail'],
  website: ['webbadress', 'hemsida', 'webb', 'www', 'webbplats', 'website', 'url'],
  status: ['status', 'verksamhetsstatus', 'aktiv', 'foretagsstatus'],
  registered: ['registreringsdatum', 'startdatum', 'bildat', 'registrerad', 'registrerat', 'nystartsdatum', 'startar', 'regdat'],
};
const ALIAS_LOOKUP = new Map();
for (const [field, list] of Object.entries(ALIASES)) for (const a of list) if (!ALIAS_LOOKUP.has(a)) ALIAS_LOOKUP.set(a, field);

const str = (v, max = 200) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s && s.toLowerCase() !== 'null' ? s.slice(0, max) : null;
};

export function normOrgnr(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  const ten = d.length === 12 ? d.slice(2) : d;
  return ten.length === 10 ? `${ten.slice(0, 6)}-${ten.slice(6)}` : null;
}
// Platshållare som 0700000000 eller 0123456789 är inga riktiga nummer.
const isPlaceholderPhone = (p) => /^(\d)\1+$/.test(p) || /^0\d?0{7,}$/.test(p) || /(\d)\1{6,}/.test(p) || /^0?1234567/.test(p);
function normPhone(v) {
  const s = str(v, 40);
  if (!s) return { phone: null, plain: null };
  let plain = s.replace(/\D/g, '');
  if (s.startsWith('+46')) plain = '0' + plain.slice(2);
  else if (plain.startsWith('0046')) plain = '0' + plain.slice(4);
  if (plain.length < 5) return { phone: null, plain: null };
  if (isPlaceholderPhone(plain)) return { phone: null, plain: null };
  return { phone: s, plain };
}
function normEmail(v) {
  const s = str(v, 120)?.toLowerCase();
  return s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}
// SCB:s API skickar lokal midnatt som UTC ("1975-07-01T22:00:00.000Z" = 2 juli, svensk tid). Tid från 22:00 UTC hör därför till nästa dag.
function normDate(v) {
  const s = str(v, 40);
  if (!s) return null;
  if (/T[\d:.]+Z$/.test(s)) {
    const d = new Date(s);
    if (isNaN(d)) return null;
    if (d.getUTCHours() >= 22) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
function normStatus(v) {
  const s = str(v, 30);
  if (!s) return 'Aktiv';
  const l = s.toLowerCase();
  if (/^(0|nej|false)$/.test(l) || /inaktiv|avslut|upph|likvid|konkurs|avreg|vilande/.test(l)) return 'Avslutad';
  return 'Aktiv';
}
// SCB ftgStat: 1 = verksam, 9 = ej längre verksam, 0 = har aldrig varit verksam
function statusFromFtgStat(code) {
  if (code === '1') return 'Aktiv';
  if (code === '9') return 'Avslutad';
  if (code === '0') return 'Aldrig verksam';
  return null;
}

function legalForm(v) {
  const s = str(v, 60);
  if (s && /^\d{1,2}$/.test(s)) {
    const code = s.padStart(2, '0');
    return FORM_LABELS[Number(code)] ?? CODES.jurform?.[code] ?? null;
  }
  return s;
}
function county(v) {
  const s = str(v, 60);
  if (s && /^\d{1,2}$/.test(s)) return LAN_CODES[s.padStart(2, '0')] ?? null; // '00' (okänt län) → inget län
  return s;
}
function municipality(v) {
  const s = str(v, 60);
  if (s && /^\d{3,4}$/.test(s)) {
    const code = s.padStart(4, '0');
    return code === '0000' || code === '9999' ? null : CODES.kommun?.[code] ?? null; // saknad / ej svensk hemortskommun
  }
  return s;
}
function postcode(v) {
  const s = str(v, 10)?.replace(/\s/g, '') ?? null;
  return s && /^\d{5}$/.test(s) ? `${s.slice(0, 3)} ${s.slice(3)}` : s;
}
// "1-4 anställda" → "1–4", "10000- anställda" → "10000+", kod 0 (uppgift saknas) → null
function employeesFromClass(code) {
  const s = str(code, 4);
  if (!s || s === '0') return null;
  const text = CODES.anstkl?.[s];
  if (!text) return null;
  return text.replace(/\s*anställda\s*$/i, '').replace(/-$/, '+').replace('-', '–');
}
// Omsättningsklass → { label: "1 000 - 4 999 tkr", min: 1000 }. Klass 0 ("< 1 tkr") betyder oftast "ingen uppgift" och sparas som tom.
function revenueFromClass(code) {
  const s = str(code, 3);
  const text = s && s !== '0' ? CODES.omskl?.[s] : null;
  if (!text) return { label: null, min: null };
  const min = text.replace(/^[^\d]*/, '').match(/^\d[\d ]*/)?.[0].replace(/\s/g, '');
  return { label: text.replace(/\s*-\s*/, '–'), min: min ? Number(min) : null };
}
function empMin(label) {
  if (!label) return null;
  const m = label.match(/\d+/);
  return m ? Number(m[0]) : null;
}

// Plattar ut kapslat JSON (filer). Varje blad registreras både under sitt eget namn och
// under föräldernamn+bladnamn (t.ex. sni.kod → snikod). Första icke-tomma värdet vinner.
function flatten(obj, out = {}, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, out, k);
    else {
      const val = Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? '' : x)).join(' ').trim() : v;
      for (const key of prefix ? [k, prefix + k] : [k]) {
        if (!(key in out) || out[key] === null || out[key] === '') out[key] = val;
      }
    }
  }
  return out;
}

// SCB:s API (jeFullData). Fälten har fasta namn, så de läses direkt.
const isScbApi = (o) => o && typeof o === 'object' && ('peOrgNr' in o || 'orgNr' in o) && ('jurform' in o || 'anstKl' in o || 'naringsgrenar' in o);
function scbApiFields(j) {
  const sni = (Array.isArray(j.naringsgrenar) ? j.naringsgrenar : [])
    .filter((n) => n?.naringsgren)
    .sort((a, b) => (a.rangordning ?? 99) - (b.rangordning ?? 99))[0]; // huvudnäringsgren = lägst rangordning
  const a = j.postAdress || {};
  return {
    orgnr: j.peOrgNr || j.orgNr,
    name: str(j.foretagsnamn, 200) && j.jurform === '10' ? j.foretagsnamn : j.namn,
    legal_form: j.jurform,
    sni: sni?.naringsgren,
    sni_text: sni ? CODES.sni?.[String(sni.naringsgren)] : null,
    county: j.lanSate,
    municipality: j.kommunSate,
    address: a.gatuAdress,
    postcode: a.postNr,
    city: a.postOrt,
    emp_class: j.anstKl,
    phone: j.tel,
    email: j.epost,
    status: statusFromFtgStat(String(j.ftgStat ?? '')) ?? 'Aktiv',
    registered: j.regDat,
    revenue_class: j.omsKl,
    revenue_year: j.omsAr,
  };
}

function fileFields(raw) {
  const flat = flatten(raw);
  const r = {};
  for (const [k, v] of Object.entries(flat)) {
    const field = ALIAS_LOOKUP.get(fold(k));
    if (field && (r[field] === undefined || r[field] === null || r[field] === '')) r[field] = v;
  }
  r.status = normStatus(r.status);
  return r;
}

export function mapRecord(raw) {
  const r = isScbApi(raw) ? scbApiFields(raw) : fileFields(raw);
  const orgnr = normOrgnr(r.orgnr);
  const name = str(r.name, 200);
  if (!orgnr || !name) return null;

  let sni = str(r.sni, 40);
  let sniText = str(r.sni_text, 200);
  if (!sni && sniText && /^[\d.\s]+$/.test(sniText)) { sni = sniText; sniText = null; } // kolumnen "Näringsgren" innehöll en kod
  if (sni) {
    const m = sni.match(/^[\d.\s]+/);
    const digits = (m ? m[0] : '').replace(/\D/g, '');
    if (!sniText && m && sni.length > m[0].length) sniText = str(sni.slice(m[0].length), 200);
    sni = digits || null;
    if (sni && !sniText) sniText = CODES.sni?.[sni] ?? null;
  }
  const employees = str(r.emp_class) != null && str(r.employees) == null ? employeesFromClass(r.emp_class) : str(r.employees, 30);
  const ph = normPhone(r.phone);
  const rev = revenueFromClass(r.revenue_class);
  const revYear = Number(r.revenue_year) > 1990 && rev.label ? Number(r.revenue_year) : null;

  return {
    orgnr,
    orgnr_plain: orgnr.replace('-', ''),
    name,
    name_norm: name.toLowerCase(),
    legal_form: legalForm(r.legal_form),
    sni,
    sni_text: sniText,
    county: county(r.county),
    municipality: municipality(r.municipality),
    address: str(r.address, 120),
    postcode: postcode(r.postcode),
    city: str(r.city, 60),
    employees,
    emp_min: empMin(employees),
    phone: ph.phone,
    phone_plain: ph.plain,
    email: normEmail(r.email),
    website: str(r.website, 150),
    status: r.status ?? 'Aktiv',
    registered: normDate(r.registered),
    revenue: rev.label,
    revenue_min: rev.min,
    revenue_year: revYear,
  };
}
