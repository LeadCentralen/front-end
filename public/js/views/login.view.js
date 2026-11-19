import { el, clear } from '../utils/dom.js';

export function renderLogin(root, { setup, notice, signup, onSubmit }) {
  const err = el('p', { class: 'error', role: 'alert' });
  const name = el('input', { id: 'l-name', type: 'text', autocomplete: 'name', required: true });
  const email = el('input', { id: 'l-email', type: 'email', autocomplete: 'username', required: true });
  const pw = el('input', { id: 'l-pw', type: 'password', autocomplete: setup ? 'new-password' : 'current-password', required: true, minLength: setup ? 10 : 1 });
  const form = el('form', { class: 'card', onsubmit: async (e) => {
    e.preventDefault();
    err.textContent = '';
    try { await onSubmit({ name: name.value, email: email.value, password: pw.value }); }
    catch (x) { err.textContent = x.message; }
  } },
    el('h2', null, setup ? 'Skapa administratörskonto' : 'Logga in'),
    notice && el('div', { class: 'banner warn', role: 'status' }, notice),
    setup && el('p', { class: 'muted' }, 'Välkommen! Skapa det första kontot. Det blir plattformsadministratör. Företag skapar sedan egna konton på startsidan.'),
    setup && el('div', { class: 'field' }, el('label', { for: 'l-name' }, 'Namn'), name),
    el('div', { class: 'field' }, el('label', { for: 'l-email' }, 'E-postadress'), email),
    el('div', { class: 'field' }, el('label', { for: 'l-pw' }, setup ? 'Lösenord (minst 10 tecken)' : 'Lösenord'), pw),
    err,
    el('button', { class: 'btn primary', type: 'submit' }, setup ? 'Skapa konto' : 'Logga in'),
    !setup && signup && el('p', { class: 'small spaced-top' }, 'Ny hos oss? ', el('a', { href: '#/skapa-konto' }, 'Prova gratis i 3 dagar')),
    el('p', { class: 'muted small spaced-top' }, 'Vi använder en enda nödvändig cookie för att hålla dig inloggad. Läs mer i ', el('a', { href: '#/cookies' }, 'cookiepolicyn'), ' och ', el('a', { href: '#/integritet' }, 'integritetspolicyn'), '.'));
  clear(root).append(el('div', { class: 'auth' }, el('h1', { class: 'sr-only' }, 'Leadcentralen'), form, !setup && el('p', { class: 'center small' }, el('a', { href: '#/' }, '← Till startsidan'))));
  (setup ? name : email).focus();
}
