import { state } from '../state.js';
import { AuthModel } from '../models/auth.model.js';

// Loggar ut efter inaktivitet (samma tid som servern). Medan personen är aktiv i fönstret skickas ett
// lätt anrop då och då så att servern ser att sessionen lever, även när man bara skriver en anteckning.
export const NOTICE_KEY = 'lc_notice';
let started = false;

export function watchIdle(onTimeout) {
  if (started) return;
  started = true;
  const limit = (state.config?.idleMinutes || 30) * 60e3;
  let last = Date.now();
  let lastPing = Date.now();
  let dirty = false;
  const mark = () => { last = Date.now(); dirty = true; };
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart']) window.addEventListener(ev, mark, { passive: true });
  setInterval(async () => {
    if (!state.user) return;
    const now = Date.now();
    if (now - last > limit) {
      try { sessionStorage.setItem(NOTICE_KEY, 'Du loggades ut efter ' + Math.round(limit / 60e3) + ' minuters inaktivitet, för din säkerhet. Logga in igen.'); } catch { /* ignoreras */ }
      onTimeout();
    } else if (dirty && now - lastPing > Math.min(120e3, limit / 3)) {
      dirty = false; lastPing = now;
      try { await AuthModel.me(); } catch (e) {
        if (e.status === 401) {
          try { sessionStorage.setItem(NOTICE_KEY, 'Du har loggats ut. Det beror på inaktivitet eller att kontot loggades in på en annan enhet. Logga in igen.'); } catch { /* ignoreras */ }
          onTimeout();
        }
      }
    }
  }, 30e3);
}
