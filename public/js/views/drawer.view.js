import { el, clear, option } from '../utils/dom.js';
import { fmtDate, TYPE_LABELS, safeUrl } from '../utils/format.js';
import { renderCallPanel } from './call.view.js';

const fact = (label, value) => (value ? [el('dt', null, label), el('dd', null, value)] : []);

export function renderDrawerError(panel, message, onClose) {
  clear(panel).append(el('div', { class: 'drawer-body' }, el('p', { class: 'error' }, message), el('button', { class: 'btn', onclick: onClose }, 'Stäng')));
}

// h = { onClose, onAddLead, onSave(patch), onRemoveLead, onLog(type,text), onRemoveActivity(id), onCallDone(result) }
export function renderDrawer(panel, { company: c, lead, activities }, { stages, users, me }, h) {
  clear(panel);
  let call = null; // pågående samtalspanel
  const close = el('button', { class: 'btn ghost', 'aria-label': 'Stäng', onclick: () => {
    if (call?.isActive() && !confirm('Samtalet är inte loggat än. Stänga ändå?')) return;
    call?.destroy();
    h.onClose();
  } }, '✕');
  panel.append(el('div', { class: 'drawer-head' },
    el('div', null, el('h2', null, c.name),
      el('div', { class: 'muted small' }, /enskild/i.test(c.legal_form || '') ? '' : c.orgnr + (c.legal_form ? ' · ' : ''), c.legal_form || '', c.status !== 'Aktiv' ? ' · ' + c.status : '')),
    close));
  const body = el('div', { class: 'drawer-body' });
  panel.append(body);
  setTimeout(() => close.focus(), 0);

  if (/enskild/i.test(c.legal_form || '')) {
    body.append(el('div', { class: 'notice' }, 'Enskild firma: uppgifterna kan vara personuppgifter. Kontrollera NIX-Telefon, spärrar och marknadsföringsreglerna innan du kontaktar. Se Företagspolicy.'));
  }
  const site = safeUrl(c.website);
  const callSlot = el('div');
  const startCall = () => {
    if (call) return;
    call = renderCallPanel({ company: c, history: activities.filter((a) => a.type === 'call').sort((x, y) => String(y.created_at).localeCompare(String(x.created_at))).slice(0, 5) }, {
      onDone: (res) => { call.destroy(); call = null; h.onCallDone(res); },
      onCancel: () => { call.destroy(); call.el.remove(); call = null; },
    });
    callSlot.append(call.el);
    call.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  body.append(callSlot);
  body.append(
    el('section', null, el('h3', null, 'Kontakt'),
      el('dl', { class: 'facts' },
        el('dt', null, 'Telefon'), el('dd', null, !c.phone && c.has_phone ? el('span', { class: 'muted' }, 'Visas när företaget ligger i tavlan') : c.phone ? [c.phone, ' ', me.features?.phone === false ? null : el('button', { class: 'btn small primary', type: 'button', onclick: startCall }, '📞 Ring')] : el('span', { class: 'muted' }, 'Saknas')),
        el('dt', null, 'E-post'), el('dd', null, c.email ? el('a', { href: 'mailto:' + c.email }, c.email) : el('span', { class: 'muted' }, c.has_email ? 'Visas när företaget ligger i tavlan' : 'Saknas')),
        site ? [el('dt', null, 'Webb'), el('dd', null, el('a', { href: site, target: '_blank', rel: 'noopener noreferrer' }, c.website))] : [])),
    el('section', null, el('h3', null, 'Företagsuppgifter'),
      el('dl', { class: 'facts' },
        fact('Bransch', c.sni_text ? `${c.sni_text}${c.sni ? ' (' + c.sni + ')' : ''}` : c.sni),
        fact('Adress', [c.address, [c.postcode, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')),
        fact('Kommun', c.municipality), fact('Län', c.county),
        fact('Anställda', c.employees), fact('Omsättning', c.revenue ? c.revenue + (c.revenue_year ? ` (${c.revenue_year})` : '') : ''), fact('Registrerat', fmtDate(c.registered))),
      el('p', { class: 'muted small' }, `Källa: ${c.source === 'demo' ? 'demodata (påhittad)' : 'SCB:s företagsregister'}${c.updated_at ? ', hämtad ' + fmtDate(c.updated_at) : ''}.`)));

  if (!lead) {
    body.append(el('section', null, el('h3', null, 'Leadtavla'),
      el('button', { class: 'btn primary', onclick: h.onAddLead }, '+ Lägg till i leadtavlan')));
    return;
  }

  const save = (patch) => h.onSave(patch);
  body.append(el('section', null, el('h3', null, 'Uppföljning'),
    el('div', { class: 'grid-2' },
      el('div', { class: 'field' }, el('label', { for: 'f-stage' }, 'Status'),
        el('select', { id: 'f-stage', onchange: (e) => save({ stage: e.target.value }) }, stages.map((s) => option(s.id, s.label, s.id === lead.stage)))),
      el('div', { class: 'field' }, el('label', { for: 'f-owner' }, 'Ansvarig'),
        el('select', { id: 'f-owner', onchange: (e) => save({ owner_id: e.target.value ? Number(e.target.value) : null }) }, option('', 'Ingen'), users.map((u) => option(String(u.id), u.name, u.id === lead.owner_id))))),
    el('div', { class: 'field' }, el('label', { for: 'f-step' }, 'Nästa steg'),
      el('input', { id: 'f-step', type: 'text', maxLength: 200, value: lead.next_step || '', placeholder: 'T.ex. ring tillbaka efter semestern', onchange: (e) => save({ next_step: e.target.value }) })),
    el('div', { class: 'grid-2' },
      el('div', { class: 'field' }, el('label', { for: 'f-date' }, 'Datum för nästa steg'),
        el('input', { id: 'f-date', type: 'date', value: lead.next_date || '', onchange: (e) => save({ next_date: e.target.value || null }) })),
      el('div', { class: 'field' }, el('label', { for: 'f-val' }, 'Uppskattat värde'),
        el('input', { id: 'f-val', type: 'number', min: 0, step: 1000, value: lead.value ?? '', placeholder: 'kr', onchange: (e) => save({ value: e.target.value === '' ? null : Number(e.target.value) }) }))),
    el('button', { class: 'btn danger small', onclick: () => { if (confirm('Ta bort företaget från leadtavlan? Historiken raderas.')) h.onRemoveLead(); } }, 'Ta bort från tavlan')));

  let type = 'call';
  const txt = el('textarea', { id: 'f-act', maxLength: 2000, placeholder: 'Vad hände? (valfritt för samtal, e-post och möte)' });
  const typeBtns = ['call', 'email', 'meeting', 'note'].map((t) =>
    el('button', { type: 'button', 'aria-pressed': String(t === type), onclick: (e) => {
      type = t; typeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
    } }, TYPE_LABELS[t]));
  const act = el('section', null, el('h3', null, 'Kontakthistorik'),
    el('div', { class: 'seg', role: 'group', 'aria-label': 'Typ av kontakt' }, typeBtns),
    el('div', { class: 'field spaced' }, el('label', { for: 'f-act', class: 'sr-only' }, 'Anteckning'), txt),
    el('button', { class: 'btn primary', onclick: () => h.onLog(type, txt.value) }, 'Logga'));
  act.append(el('ul', { class: 'timeline' }, activities.map((a) => el('li', null,
    el('div', { class: 'meta' },
      el('span', null, `${TYPE_LABELS[a.type] || a.type}${a.user_name ? ' · ' + a.user_name : ''} · ${fmtDate(a.created_at, true)}`),
      (a.user_id === me.id || ['admin', 'owner'].includes(me.role)) && a.type !== 'stage'
        ? el('button', { class: 'btn ghost small', 'aria-label': 'Ta bort aktivitet', onclick: () => h.onRemoveActivity(a.id) }, 'Ta bort') : null),
    a.text ? el('div', { class: a.type === 'stage' ? 'txt stage' : 'txt' }, a.text) : null))));
  body.append(act);
}
