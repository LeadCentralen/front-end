import { el, clear } from '../utils/dom.js';
import { LEGAL_PAGES } from '../content/legal.content.js';

function removalForm({ onSubmit }) {
  const err = el('p', { class: 'error', role: 'alert' });
  const ok = el('p', { role: 'status' });
  const f = {
    name: el('input', { id: 'r-name', type: 'text', required: true, maxLength: 120, autocomplete: 'name' }),
    email: el('input', { id: 'r-email', type: 'email', required: true, maxLength: 120, autocomplete: 'email' }),
    org: el('input', { id: 'r-org', type: 'text', placeholder: '556677-8899', maxLength: 20 }),
    msg: el('textarea', { id: 'r-msg', maxLength: 1500 }),
  };
  const form = el('form', { class: 'card', onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ''; ok.textContent = '';
    try {
      await onSubmit({ name: f.name.value, email: f.email.value, orgnr: f.org.value, message: f.msg.value });
      ok.textContent = 'Tack! Vi har tagit emot din begäran och återkommer så snart vi kan, senast inom en månad.';
      form.reset();
    } catch (x) { err.textContent = x.message; }
  } },
    el('h3', null, 'Begär borttagning eller spärr'),
    el('div', { class: 'grid-2 spaced-top' },
      el('div', { class: 'field' }, el('label', { for: 'r-name' }, 'Ditt namn'), f.name),
      el('div', { class: 'field' }, el('label', { for: 'r-email' }, 'Din e-postadress'), f.email)),
    el('div', { class: 'field' }, el('label', { for: 'r-org' }, 'Organisationsnummer (om du vet det)'), f.org),
    el('div', { class: 'field' }, el('label', { for: 'r-msg' }, 'Meddelande'), f.msg),
    err, ok,
    el('button', { class: 'btn primary', type: 'submit' }, 'Skicka begäran'));
  return form;
}

export function renderLegal(root, { id, config, user, onRemovalRequest }) {
  const page = LEGAL_PAGES[id];
  const form = id === 'foretagspolicy' ? removalForm({ onSubmit: onRemovalRequest }) : null;
  clear(root).append(el('article', { class: 'prose' },
    user?.role === 'admin' && !config.controller.email && el('div', { class: 'banner warn' }, 'Admin: Fyll i organisationsnummer, adress och e-post (COMPANY_* i .env) och låt en jurist granska texterna innan skarp drift.'),
    el('h1', null, page.title),
    el('p', { class: 'updated' }, 'Senast uppdaterad ' + new Date(config.policyUpdated).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })),
    page.body({ config, form })));
}
