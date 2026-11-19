import { el, clear } from '../utils/dom.js';
import { fmtDate, initials, kr, todayISO } from '../utils/format.js';
import { renderCallPanel } from './call.view.js';

function afterElement(container, y) {
  let best = { offset: Number.NEGATIVE_INFINITY, node: null };
  for (const c of container.querySelectorAll('.lead-card:not(.dragging)')) {
    const box = c.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > best.offset) best = { offset, node: c };
  }
  return best.node;
}

function card(l, stages, { onOpen, onCall }) {
  const late = l.next_date && l.next_date < todayISO();
  const node = el('div', { class: 'lead-card', draggable: true, tabindex: 0, role: 'listitem', dataset: { id: l.id }, 'aria-label': `${l.name}, ${stages.find((s) => s.id === l.stage)?.label}` },
    el('div', { class: 't' }, l.name),
    el('div', { class: 'muted small' }, [l.city, l.legal_form].filter(Boolean).join(' · ')),
    l.group_name && el('div', { class: 'grp', title: 'Lista: ' + l.group_name }, l.group_name),
    l.next_step && el('div', { class: 'small' }, '→ ' + l.next_step),
    l.phone && onCall && el('button', { type: 'button', class: 'card-call', title: 'Ring ' + l.name, onclick: (e) => { e.stopPropagation(); onCall(l); } }, '📞 ' + l.phone),
    el('div', { class: 'lead-meta' },
      l.next_date && el('span', { class: 'due' + (late ? ' late' : '') }, (late ? 'Försenad: ' : 'Nästa: ') + fmtDate(l.next_date)),
      l.last_contact && el('span', null, 'Senast: ' + fmtDate(l.last_contact)),
      l.value ? el('span', null, kr(l.value)) : null,
      l.owner_name && el('span', { class: 'avatar', title: l.owner_name }, initials(l.owner_name))));
  node.addEventListener('click', () => onOpen(l.orgnr));
  node.addEventListener('keydown', (e) => { if (e.key === 'Enter') onOpen(l.orgnr); });
  node.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', String(l.id));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => node.classList.add('dragging'), 0);
  });
  node.addEventListener('dragend', () => node.classList.remove('dragging'));
  return node;
}

export function renderBoardPage(root, { mine, query, onMine, onQuery, onGroup, phoneAllowed = true, upgradeNote = null }) {
  const groupSel = el('select', { 'aria-label': 'Lista', onchange: (e) => onGroup(e.target.value) });
  const boardEl = el('div', { class: 'board', role: 'list' });
  const phoneBox = el('div');
  let phone = null;
  const count = el('span', { class: 'muted' });
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Visa' });
  const segBtn = (label, val) => el('button', { type: 'button', 'aria-pressed': String(mine === val), onclick: () => {
    [...seg.children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === val)));
    onMine(val);
  } }, label);
  seg.append(segBtn('Alla', false), segBtn('Mina', true));
  clear(root).append(
    el('div', { class: 'page-head' },
      el('div', null, el('h1', null, 'Leadtavla'), el('p', null, 'Dra korten mellan kolumnerna när du har kontaktat företaget. Klicka på ett kort för att logga samtal och anteckningar.')),
      el('div', { class: 'row' }, seg, groupSel,
        el('input', { type: 'search', placeholder: 'Filtrera i tavlan', 'aria-label': 'Filtrera i tavlan', value: query, oninput: (e) => onQuery(e.target.value) }),
        el('a', { class: 'btn primary', href: '#/' }, '+ Hitta företag'))),
    el('div', { class: 'board-layout' },
      phoneBox,
      el('div', { class: 'board-main' }, el('p', { class: 'small' }, count), boardEl)));

  return {
    // Telefonen till höger. lead = null visar vänteläget med samtalsloggen.
    showPhone(lead, history, handlers = {}) {
      if (!phoneAllowed) { phoneBox.replaceChildren(...[upgradeNote].filter(Boolean)); return; }
      phone?.destroy();
      phone = renderCallPanel({ company: lead ? { name: lead.name, phone: lead.phone } : null, history }, {
        onDone: (r) => { phone?.destroy(); handlers.onDone?.(r); },
        onCancel: () => handlers.onCancel?.(),
      });
      phoneBox.replaceChildren(phone.el);
      if (lead) phoneBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); // raden ligger över kolumnerna
    },
    // Listorna som finns i tavlan (valfritt filter)
    setGroups(groups, current) {
      groupSel.replaceChildren(el('option', { value: '' }, 'Alla listor'), ...groups.map((g) => el('option', { value: g, selected: g === current }, g)));
      groupSel.hidden = groups.length === 0;
    },
    callActive: () => !!phone?.isActive(),
    drawBoard(leads, stages, { onOpen, onMove, onCall }) {
      count.textContent = `${leads.length} företag i tavlan`;
      clear(boardEl);
      for (const s of stages) {
        const items = leads.filter((l) => l.stage === s.id);
        const body = el('div', { class: 'col-body', dataset: { stage: s.id } }, items.map((l) => card(l, stages, { onOpen, onCall })));
        body.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; body.classList.add('over'); });
        body.addEventListener('dragleave', (e) => { if (!body.contains(e.relatedTarget)) body.classList.remove('over'); });
        body.addEventListener('drop', (e) => {
          e.preventDefault();
          body.classList.remove('over');
          const id = Number(e.dataTransfer.getData('text/plain'));
          if (!id) return;
          const before = afterElement(body, e.clientY);
          onMove(id, s.id, before ? Number(before.dataset.id) : null);
        });
        boardEl.append(el('section', { class: 'col', role: 'group', 'aria-label': s.label },
          el('div', { class: 'col-head' }, el('span', { class: 'dot ' + s.id }), s.label, el('span', { class: 'count' }, items.length)), body));
      }
    },
  };
}
