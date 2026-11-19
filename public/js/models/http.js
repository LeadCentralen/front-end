import { state } from '../state.js';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function request(method, path, body, { quiet = false } = {}) {
  const headers = { 'X-LC': '1' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'Kunde inte nå servern.');
  }
  return handle(res, quiet);
}

// Filuppladdning (rå body, t.ex. SCB-import)
export async function upload(path, file) {
  const res = await fetch('/api' + path, { method: 'POST', headers: { 'X-LC': '1' }, body: file, credentials: 'same-origin' });
  return handle(res, true);
}

async function handle(res, quiet) {
  let data = null;
  try { data = await res.json(); } catch { /* ingen JSON */ }
  if (!res.ok) {
    if (res.status === 401 && !quiet) {
      if (state.user) { try { sessionStorage.setItem('lc_notice', 'Du har loggats ut. Det beror på inaktivitet eller att kontot loggades in på en annan enhet. Logga in igen.'); } catch { /* ignoreras */ } }
      state.user = null;
      if (!location.hash.startsWith('#/logga-in')) location.hash = '#/logga-in';
    }
    throw new ApiError(res.status, data?.error || 'Något gick fel.');
  }
  return data;
}

export function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== '' && v !== null && v !== undefined && v !== false) p.set(k, v === true ? '1' : v);
  const s = p.toString();
  return s ? '?' + s : '';
}
