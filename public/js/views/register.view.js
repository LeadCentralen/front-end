import { el, clear } from '../utils/dom.js';

// Skapa konto för en organisation: org.nr, företagsnamn, kontaktperson och lösenord.
// Den som skapar kontot blir kontoägare och kan sedan lägga till kollegor under Inställningar → Team.
export function renderRegister(root, { plan = 'start', plans = [], onSubmit, onLookup }) {
  const err = el('p', { class: 'error', role: 'alert' });
  const hint = el('p', { class: 'muted small field-hint', role: 'status' });
  const f = {
    orgnr: el('input', { id: 'r-orgnr', type: 'text', inputMode: 'numeric', autocomplete: 'off', placeholder: '556677-8899', required: true, maxLength: 13 }),
    orgName: el('input', { id: 'r-org', type: 'text', autocomplete: 'organization', required: true, maxLength: 120 }),
    name: el('input', { id: 'r-name', type: 'text', autocomplete: 'name', required: true, maxLength: 80 }),
    email: el('input', { id: 'r-email', type: 'email', autocomplete: 'username', required: true, maxLength: 120 }),
    phone: el('input', { id: 'r-phone', type: 'tel', autocomplete: 'tel', maxLength: 40 }),
    pw: el('input', { id: 'r-pw', type: 'password', autocomplete: 'new-password', required: true, minLength: 10 }),
    accept: el('input', { id: 'r-accept', type: 'checkbox', required: true }),
    plan: el('select', { id: 'r-plan' }, plans.map((p) => el('option', { value: p.id, selected: p.id === plan }, `${p.label} · ${p.price} kr/mån exkl. moms`))),
  };
  const planNote = el('p', { class: 'muted small field-hint' });
  const showPlan = () => {
    const p = plans.find((x) => x.id === f.plan.value);
    planNote.textContent = p ? (p.phone ? `${p.seats} användare ingår, ${p.leadsPerWeek} nya företag per vecka och telefonlänk.` : `${p.seats} användare, ${p.leadsPerWeek} nya företag per vecka. Utan telefonlänk.`) + ' Behöver ni mer? Enterprise bokas via möte.' : '';
  };
  f.plan.addEventListener('change', showPlan);
  showPlan();

  // När org.nr är komplett hämtas företagsnamnet (om det finns i registret) så man slipper skriva det
  let lastLooked = '';
  const look = async () => {
    const digits = f.orgnr.value.replace(/\D/g, '');
    if (digits.length !== 10 || digits === lastLooked) return;
    lastLooked = digits;
    hint.textContent = 'Kontrollerar organisationsnumret …';
    try {
      const r = await onLookup(digits);
      if (r.name && !f.orgName.value.trim()) f.orgName.value = r.name;
      hint.textContent = r.name ? `Hittade: ${r.name}` : 'Numret är giltigt. Fyll i företagets namn.';
    } catch (e) { hint.textContent = e.message; }
  };
  f.orgnr.addEventListener('input', look);
  f.orgnr.addEventListener('blur', look);

  const field = (id, label, input, note) => el('div', { class: 'field' }, el('label', { for: id }, label), input, note);
  const submit = el('button', { class: 'btn primary', type: 'submit' }, 'Starta gratis provperiod');
  const form = el('form', { class: 'card auth-card', onsubmit: async (e) => {
    e.preventDefault();
    err.textContent = '';
    submit.disabled = true;
    try {
      await onSubmit({ orgnr: f.orgnr.value, orgName: f.orgName.value, name: f.name.value, email: f.email.value, phone: f.phone.value, password: f.pw.value, accept: f.accept.checked, plan: f.plan.value });
    } catch (x) { err.textContent = x.message; submit.disabled = false; }
  } },
    el('h2', null, 'Prova gratis i 3 dagar'),
    el('p', { class: 'muted' }, 'Ingen betalning eller kort behövs. Du blir kontoägare och kan lägga till kollegor under Inställningar → Team. Efter 3 dagar hör vi av oss om ni vill fortsätta.'),
    plans.length ? [el('h3', { class: 'form-sec' }, 'Paket'), field('r-plan', 'Välj paket', f.plan, planNote)] : null,
    el('h3', { class: 'form-sec' }, 'Företaget'),
    field('r-orgnr', 'Organisationsnummer', f.orgnr, hint),
    field('r-org', 'Företagsnamn', f.orgName),
    el('h3', { class: 'form-sec' }, 'Du som kontoägare'),
    el('div', { class: 'grid-2' }, field('r-name', 'Ditt namn', f.name), field('r-phone', 'Telefon (valfritt)', f.phone)),
    field('r-email', 'E-postadress (används för inloggning)', f.email),
    field('r-pw', 'Lösenord (minst 10 tecken)', f.pw),
    el('div', { class: 'accept' }, f.accept,
      el('label', { for: 'r-accept' }, 'Jag har läst ', el('a', { href: '#/villkor', target: '_blank' }, 'användarvillkoren'), ' och ', el('a', { href: '#/integritet', target: '_blank' }, 'integritetspolicyn'), '.')),
    err, submit,
    el('p', { class: 'muted small spaced-top' }, 'Har ni redan ett konto? ', el('a', { href: '#/logga-in' }, 'Logga in'), '. Ska du ansluta till ett företag som redan är kund? Be er kontoägare lägga till dig.'));
  clear(root).append(el('div', { class: 'auth auth-wide' }, el('h1', { class: 'sr-only' }, 'Prova gratis'), form, el('p', { class: 'center small' }, el('a', { href: '#/' }, '← Till startsidan'))));
  f.orgnr.focus();
}
