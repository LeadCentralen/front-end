import { el } from '../utils/dom.js';
import { PhoneModel } from '../models/phone.model.js';
import { openPhoneGuide } from './phone-guide.view.js';

// Dialog: anslut telefonen med en engångskod. Visar när telefonen svarar.
export function openPhonePairing(onChange) {
  const url = location.origin + '/telefon.html';
  const codeBox = el('div', { class: 'pair-code', 'aria-live': 'polite' }, '…');
  const state = el('p', { class: 'pair-state', role: 'status' }, 'Väntar på telefonen …');
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  let timer = null;
  let expire = null;

  const dlg = el('dialog', { class: 'guide', 'aria-labelledby': 'pair-h' },
    el('div', { class: 'guide-head' }, el('h2', { id: 'pair-h' }, 'Anslut din telefon'), el('button', { class: 'btn ghost', 'aria-label': 'Stäng', onclick: () => dlg.close() }, '✕')),
    el('p', { class: 'muted' }, 'Gratis. Samtalen går i din egen telefon med ditt eget abonnemang, så du betalar bara det du redan gör hos din operatör. Fungerar med både iPhone och Android, utan app. Du måste ansluta telefonen för att kunna ringa, så att samtalstiden i loggen är verklig.'),
    local && el('div', { class: 'banner warn' }, 'Du använder sidan via localhost. Telefonen kan inte nå den adressen. Öppna Leadcentralen via datorns nätverksadress (eller den riktiga domänen) i stället.'),
    el('ol', { class: 'guide-steps' },
      el('li', null, el('strong', null, 'Öppna den här adressen i telefonens webbläsare'), el('p', null, el('code', null, url))),
      el('li', null, el('strong', null, 'Skriv in koden'), codeBox, el('p', null, 'Koden gäller i 5 minuter och kan bara användas en gång.')),
      el('li', null, el('strong', null, 'Låt sidan vara öppen på telefonen'), el('p', null, 'När du klickar på ett telefonnummer här på datorn dyker samtalet upp i telefonen. Tryck på Ring, så startar samtalet med din vanliga uppringare. Tips: lägg sidan på hemskärmen och låt skärmen vara tänd.'))),
    state,
    el('div', { class: 'guide-foot row' },
      el('button', { class: 'btn ghost small', onclick: async () => { await PhoneModel.unpair(); state.textContent = 'Telefonen är bortkopplad.'; onChange?.(); newCode(); } }, 'Koppla bort telefonen'),
      el('button', { class: 'btn ghost small', onclick: () => { dlg.close(); openPhoneGuide(); } }, 'Guide: Android / iPhone'),
      el('button', { class: 'btn primary', onclick: () => dlg.close() }, 'Klart')));

  async function newCode() {
    try {
      const r = await PhoneModel.pairCode();
      codeBox.textContent = r.code;
      clearTimeout(expire);
      expire = setTimeout(() => { codeBox.textContent = 'Koden har gått ut'; }, r.expiresInSeconds * 1000);
    } catch (e) { codeBox.textContent = e.message; }
  }
  async function check() {
    try {
      const s = await PhoneModel.status();
      if (s.connected) { state.textContent = '✔ Telefonen är ansluten' + (s.name ? ` (${s.name})` : '') + '.'; onChange?.(); }
      else if (s.paired) state.textContent = 'Telefonen är kopplad men sidan är inte öppen på den just nu. Öppna adressen ovan på telefonen.';
      else state.textContent = 'Väntar på telefonen …';
    } catch { /* ignoreras */ }
  }

  dlg.addEventListener('close', () => { clearInterval(timer); clearTimeout(expire); dlg.remove(); });
  document.body.append(dlg);
  dlg.showModal();
  newCode();
  check();
  timer = setInterval(check, 2500);
}
