import { el, clear, option } from '../utils/dom.js';
import { nf } from '../utils/format.js';

// Ritar sidan och returnerar { drawResults, showError }.
export function renderSearch(root, { filters, facets, stages, demo, isAdmin, onChange, onReset, onOpen, onAdd, onPage, onBulk }) {
  const stageById = Object.fromEntries(stages.map((s) => [s.id, s.label]));
  const resultsBox = el('div', { 'aria-live': 'polite' });
  const muniSel = el('select', { id: 's-muni' });

  const bind = (key, node, { debounced = false, checkbox = false } = {}) => {
    node.addEventListener(checkbox ? 'change' : 'input', () => {
      onChange(key, checkbox ? node.checked : node.value, debounced);
      if (key === 'county') refreshMunis();
    });
    return node;
  };
  const sel = (key, id, opts, first) => bind(key, el('select', { id }, option('', first), opts.map(([v, l]) => option(v, l, filters[key] === v))));
  const field = (label, id, node) => el('div', { class: 'field' }, el('label', { for: id }, label), node);

  function refreshMunis() {
    clear(muniSel).append(option('', 'Alla kommuner'));
    const list = filters.county ? facets.municipalities[filters.county] || [] : [...new Set(Object.values(facets.municipalities).flat())].sort((a, b) => a.localeCompare(b, 'sv'));
    list.forEach((m) => muniSel.append(option(m, m, m === filters.municipality)));
  }
  muniSel.addEventListener('input', () => onChange('municipality', muniSel.value, false));
  refreshMunis();

  const search = bind('q', el('input', { id: 's-q', type: 'search', placeholder: 'Företagsnamn, organisationsnummer eller telefon', value: filters.q, autocomplete: 'off', 'aria-label': 'Sök företag' }), { debounced: true });
  const sni = bind('sni', el('input', { id: 's-sni', type: 'text', placeholder: 'SNI-kod eller ord, t.ex. 62100', value: filters.sni }), { debounced: true });
  const sortSel = bind('sort', el('select', { id: 's-sort', 'aria-label': 'Sortera' },
    [['namn', 'Namn A–Ö'], ['namn_desc', 'Namn Ö–A'], ['anstallda', 'Flest anställda'], ['omsattning', 'Högst omsättning'], ['nyast', 'Nyast registrerade'], ['orgnr', 'Organisationsnummer']].map(([v, l]) => option(v, l, filters.sort === v))));

  const activeCount = ['county', 'municipality', 'section', 'sni', 'size', 'revenue', 'form', 'lead', 'hasPhone', 'hasEmail'].filter((k) => filters[k]).length + (filters.status !== 'Aktiv' ? 1 : 0);
  const filterPanel = el('details', { class: 'filters', open: window.innerWidth > 900 },
    el('summary', null, el('span', null, 'Filter', activeCount > 0 && el('span', { class: 'badge' }, String(activeCount))), el('button', { type: 'button', class: 'btn ghost small', onclick: (e) => { e.preventDefault(); onReset(); } }, 'Rensa')),
    field('Län', 's-county', sel('county', 's-county', facets.counties.map((c) => [c, c]), 'Alla län')),
    field('Kommun', 's-muni', muniSel),
    field('Bransch', 's-section', sel('section', 's-section', facets.sections.map((s) => [s.id, `${s.id} · ${s.label}`]), 'Alla branscher')),
    field('SNI-kod eller branschord', 's-sni', sni),
    field('Storlek', 's-size', sel('size', 's-size', facets.sizes.map((s) => [s.id, s.label]), 'Alla storlekar')),
    field('Omsättning', 's-revenue', sel('revenue', 's-revenue', facets.revenues.map((s) => [s.id, s.label]), 'Alla omsättningar')),
    field('Bolagsform', 's-form', sel('form', 's-form', facets.forms.map((f) => [f, f]), 'Alla former')),
    field('Leadstatus', 's-lead', sel('lead', 's-lead', [['none', 'Inte i tavlan (ej kontaktade)'], ['any', 'Finns i tavlan'], ...stages.map((s) => [s.id, s.label])], 'Alla')),
    el('label', { class: 'check' }, bind('hasPhone', el('input', { type: 'checkbox', checked: filters.hasPhone }), { checkbox: true }), 'Har telefonnummer'),
    el('label', { class: 'check' }, bind('hasEmail', el('input', { type: 'checkbox', checked: filters.hasEmail }), { checkbox: true }), 'Har e-postadress'),
    field('Visa', 's-status', bind('status', el('select', { id: 's-status' },
      [['Aktiv', 'Endast aktiva'], ['Avslutad', 'Endast avslutade'], ['Aldrig verksam', 'Aldrig verksamma'], ['alla', 'Alla']].map(([v, l]) => option(v, l, filters.status === v))))));

  clear(root).append(...[
    el('div', { class: 'page-head' },
      el('div', null, el('h1', null, 'Sök företag'), el('p', null, 'Sök bland svenska företag och lägg de intressanta i din leadtavla.'))),
    demo && el('div', { class: 'banner warn' }, 'Du ser demodata (påhittade företag). ',
      isAdmin ? el('a', { href: '#/installningar/import' }, 'Importera riktiga uppgifter från SCB under Inställningar.') : 'Be en administratör importera riktiga uppgifter.'),
    el('div', { class: 'search-layout' }, filterPanel, el('div', null, el('div', { class: 'searchbar' }, search), resultsBox))].filter(Boolean));

  return {
    showError: (msg) => clear(resultsBox).append(el('p', { class: 'error' }, msg)),
    drawResults(data) {
      const allPages = Math.max(1, Math.ceil(data.total / data.pageSize));
      const pages = Math.min(allPages, data.maxPage || allPages);
      clear(resultsBox).append(...[
        el('div', { class: 'results-meta' },
          el('strong', null, `${nf(data.total)} företag`),
          el('div', { class: 'row' },
            el('label', { for: 's-sort', class: 'sr-only' }, 'Sortera'), sortSel,
            data.total > 0 && el('button', { type: 'button', class: 'btn small primary', title: 'Lägg alla träffar i det här filtret i leadtavlan', onclick: onBulk }, '+ Lägg alla i tavlan'))),
        data.rows.some((r) => !r.phone && r.has_phone || !r.email && r.has_email) && el('p', { class: 'muted small' }, 'Telefonnummer och e-post visas när företaget ligger i din leadtavla.'),
        data.rows.length === 0
          ? el('div', { class: 'table-wrap' }, el('div', { class: 'empty' }, el('h3', null, 'Inga träffar'), el('p', null, 'Prova att ta bort något filter eller söka på ett kortare ord.')))
          : el('div', { class: 'table-wrap' }, el('table', null,
            el('thead', null, el('tr', null, [['Företag', 'c-name'], ['Ort', 'c-city'], ['Bransch', 'c-sni hide-md'], ['Storlek', 'c-size'], ['Kontakt', 'c-contact'], ['', 'c-act']].map(([h, c]) => el('th', { scope: 'col', class: c }, h)))),
            el('tbody', null, data.rows.map((r) => el('tr', { onclick: (e) => { if (!e.target.closest('a,button.add')) onOpen(r.orgnr); } },
              el('td', { class: 'c-name' }, el('button', { class: 'co-name', onclick: (e) => { e.stopPropagation(); onOpen(r.orgnr); } }, r.name),
                el('div', { class: 'co-sub' }, /enskild/i.test(r.legal_form || '') ? '' : r.orgnr + (r.legal_form ? ' · ' : ''), r.legal_form || '', r.status !== 'Aktiv' ? ' · ' + r.status : ''),
                (r.sni_text || r.sni) && el('div', { class: 'co-sub show-md' }, r.sni_text || r.sni)),
              el('td', { class: 'c-city', 'data-label': 'Ort' }, r.city || r.municipality || ''),
              el('td', { class: 'c-sni hide-md', 'data-label': 'Bransch' }, r.sni_text || r.sni || ''),
              el('td', { class: 'c-size', 'data-label': 'Storlek' },
                el('div', null, r.employees ? r.employees + ' anst.' : el('span', { class: 'muted' }, '–')),
                r.revenue && el('div', { class: 'co-sub' }, r.revenue)),
              el('td', { class: 'c-contact', 'data-label': 'Kontakt' },
                r.phone ? el('div', null, r.phone) : (r.has_phone ? el('div', { class: 'muted small', title: 'Visas när företaget ligger i din leadtavla' }, '📞 Telefon finns') : null),
                r.email ? el('div', { class: 'ellip' }, el('a', { href: 'mailto:' + r.email, title: r.email }, r.email)) : (r.has_email ? el('div', { class: 'muted small', title: 'Visas när företaget ligger i din leadtavla' }, '✉ E-post finns') : null)),
              el('td', { class: 'c-act act' }, r.lead_id
                ? el('span', { class: 'chip' }, el('span', { class: 'dot ' + r.stage }), stageById[r.stage] || r.stage)
                : el('button', { class: 'btn small add', onclick: (e) => { e.stopPropagation(); onAdd(r.orgnr); } }, '+ Tavla'))))))),
        pages < allPages && el('p', { class: 'muted small' }, `Sökningen visar de första ${nf(pages * data.pageSize)} företagen. Lägg till fler filter för att se resten.`),
        pages > 1 && el('div', { class: 'pager' },
          el('button', { class: 'btn small', disabled: data.page <= 1, onclick: () => onPage(data.page - 1) }, '← Föregående'),
          `Sida ${nf(data.page)} av ${nf(pages)}`,
          el('button', { class: 'btn small', disabled: data.page >= pages, onclick: () => onPage(data.page + 1) }, 'Nästa →'))].filter(Boolean));
    },
  };
}
