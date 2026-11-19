import { config } from '../config/index.js';

export const SESSION_COOKIE = 'lc_session';

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const raw = part.slice(i + 1).trim();
    let value = raw;
    try { value = decodeURIComponent(raw); } catch { /* ogiltig %-kodning: använd råvärdet */ }
    out[part.slice(0, i).trim()] = value;
  }
  return out;
}
export const getSessionToken = (req) => parseCookies(req)[SESSION_COOKIE] || null;

export function setSessionCookie(res, token, expires) {
  const parts = [`${SESSION_COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Expires=${new Date(expires).toUTCString()}`];
  if (config.production) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.production ? '; Secure' : ''}`);
}
