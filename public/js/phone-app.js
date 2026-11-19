import { el, clear } from './utils/dom.js';

// Telefonlänk, telefonens sida. Kopplas en gång med en kod från datorn och väntar sedan på "ring det här numret".
// Samtalet går i telefonen på användarens egen SIM. Sidan mäter tiden man är borta från den under samtalet.
const KEY = 'lc_phone_token';
const root = document.getElementById('phone-app');
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (v) => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* ignoreras */ } },
};
let token = store.get();
let running = false;
let wakeLock = null;

async function api(method, path, body, signal) {
  const headers = { 'X-LC': '1' };
  if (token) headers['X-Phone-Token'] = token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
  let data = null;
  try { data = await res.json(); } catch { /* ingen JSON */ }
  if (!res.ok) { const e = new Error(data?.error || 'Något gick fel.'); e.status = res.status; throw e; }
  return data;
}

// Håller skärmen tänd så att sidan kan ta emot samtal (stöds inte i alla webbläsare).
async function keepAwake() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* ignoreras */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && token) keepAwake(); });

function pairScreen(msg) {
  const code = el('input', { type: 'text', inputMode: 'numeric', autocomplete: 'one-time-code', maxLength: 6, placeholder: '6 siffror', 'aria-label': 'Kod från datorn', class: 'phone-code' });
  const err = el('p', { class: 'error', role: 'alert' }, msg || '');
  clear(root).append(el('div', { class: 'phone-card' },
    el('h1', null, 'Leadcentralen Telefon'),
    el('p', { class: 'muted' }, 'Anslut telefonen en gång. På datorn: klicka på "Anslut din telefon" i samtalsrutan och skriv in koden här. Samtalen går sedan i den här telefonen, med ditt eget abonnemang.'),
    code, err,
    el('button', { class: 'btn primary phone-big', type: 'button', onclick: async () => {
      err.textContent = '';
      try {
        const ua = navigator.userAgent;
        const r = await api('POST', '/phone/pair', { code: code.value, name: ua.includes('iPhone') ? 'iPhone' : ua.includes('Android') ? 'Android-telefon' : 'Telefon' });
        token = r.token; store.set(token);
        waiting();
        start();
      } catch (e) { err.textContent = e.message; }
    } }, 'Anslut')));
  code.focus();
}

function waiting(note) {
  clear(root).append(el('div', { class: 'phone-card' },
    el('div', { class: 'phone-ok' }, '● Ansluten'),
    el('h1', null, 'Redo att ringa'),
    el('p', { class: 'muted' }, note || 'Klicka på ett telefonnummer i Leadcentralen på datorn, så dyker samtalet upp här. Låt den här sidan vara öppen och skärmen tänd.'),
    el('button', { class: 'btn ghost small', type: 'button', onclick: () => { if (confirm('Koppla bort den här telefonen?')) { token = null; store.set(null); pairScreen(); } } }, 'Koppla bort')));
}

// Visar ett samtal. Returnerar när samtalet är klart.
function showCall(call) {
  return new Promise((resolve) => {
    let t0 = null;
    const finish = async () => {
      document.removeEventListener('visibilitychange', onVisible);
      const seconds = t0 === null ? 0 : Math.round((Date.now() - t0) / 1000);
      try { await api('POST', '/phone/report', { callId: call.callId, state: 'returned', seconds }); } catch { /* datorn kan avsluta manuellt */ }
      waiting('Samtalet är klart. Fortsätt på datorn och logga hur det gick.');
      resolve();
    };
    function onVisible() { if (document.visibilityState === 'visible' && t0 !== null) finish(); }
    clear(root).append(el('div', { class: 'phone-card' },
      el('p', { class: 'muted' }, 'Ring från Leadcentralen'),
      el('h1', null, call.name || 'Företag'),
      el('p', { class: 'phone-number' }, call.number),
      el('button', { class: 'btn primary phone-big', type: 'button', onclick: async () => {
        t0 = Date.now();
        try { await api('POST', '/phone/report', { callId: call.callId, state: 'opened' }); } catch { /* ignoreras */ }
        document.addEventListener('visibilitychange', onVisible);
        location.href = 'tel:' + call.number;
      } }, '📞 Ring'),
      el('button', { class: 'btn ghost', type: 'button', onclick: finish }, 'Avbryt / samtalet är klart')));
  });
}

async function start() {
  if (running || !token) return;
  running = true;
  keepAwake();
  while (token) {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 35e3);
    try {
      const r = await api('GET', '/phone/poll', undefined, ctl.signal);
      clearTimeout(timeout);
      if (r.call) await showCall(r.call);
    } catch (e) {
      clearTimeout(timeout);
      if (e.status === 401) { token = null; store.set(null); pairScreen('Anslutningen har tagits bort. Anslut igen.'); break; }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  running = false;
}

if (token) { waiting(); start(); } else pairScreen();
