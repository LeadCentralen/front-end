import { el, clear } from '../utils/dom.js';
import { nf } from '../utils/format.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
  for (const k of kids.flat()) if (k) n.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return n;
};

const PERIODS = [[7, '7 dagar'], [30, '30 dagar'], [90, '90 dagar'], [365, '12 månader']];
const MONTHS = ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];
const dayLabel = (iso) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const pct = (v) => (v === null || v === undefined ? '–' : `${String(v).replace('.', ',')} %`);
const dur = (s) => (!s ? '–' : s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`);
const niceMax = (m) => { if (m <= 4) return 4; const p = 10 ** Math.floor(Math.log10(m)); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };

// Ett tooltip-element per diagram. Marker har fokus och hover.
function withTip(box) {
  const tip = el('div', { class: 'viz-tip', role: 'status', hidden: true });
  box.append(tip);
  const place = (e, target) => {
    const r = box.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const x = (e && e.clientX !== undefined && e.type !== 'focus' ? e.clientX : t.left + t.width / 2) - r.left;
    tip.style.left = Math.max(60, Math.min(r.width - 60, x)) + 'px';
    tip.style.top = Math.max(0, t.top - r.top - 8) + 'px';
  };
  return (mark, text) => {
    mark.setAttribute('tabindex', '0');
    const on = (e) => { tip.textContent = text; tip.hidden = false; place(e, mark); };
    const off = () => { tip.hidden = true; };
    mark.addEventListener('mouseenter', on); mark.addEventListener('mousemove', on); mark.addEventListener('focus', on);
    mark.addEventListener('mouseleave', off); mark.addEventListener('blur', off);
  };
}

function tableView(headers, rows) {
  return el('details', { class: 'viz-table' }, el('summary', null, 'Visa som tabell'),
    el('div', { class: 'table-wrap' }, el('table', null,
      el('thead', null, el('tr', null, headers.map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', null, rows.map((r) => el('tr', null, r.map((c) => el('td', null, c))))))));
}

const card = (title, sub, ...body) => el('section', { class: 'card viz' }, el('h2', null, title), sub && el('p', { class: 'muted small' }, sub), ...body);
const legend = (items) => el('div', { class: 'viz-legend' }, items.map(([cls, label]) => el('span', null, el('i', { class: 'sw ' + cls }), label)));

// Staplar per dag: svarade (blå) och övriga (orange), tvåpixlars luft mellan segmenten.
function dayChart(perDay) {
  const W = 720; const H = 230; const L = 34; const B = 26; const T = 10;
  const max = niceMax(Math.max(1, ...perDay.map((d) => d.answered + d.other)));
  const slot = (W - L - 8) / perDay.length;
  const bw = Math.min(24, slot * 0.7);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const box = el('div', { class: 'viz-wrap' });
  const tip = withTip(box);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-svg', role: 'img', 'aria-label': 'Antal samtal per dag, uppdelat i besvarade och övriga. Tabellvy finns under diagrammet.' });
  for (const v of [0, max / 2, max]) {
    svg.append(sv('line', { x1: L, x2: W - 4, y1: y(v), y2: y(v), class: v === 0 ? 'viz-base' : 'viz-grid' }), sv('text', { x: L - 6, y: y(v) + 4, class: 'viz-tick', 'text-anchor': 'end' }, nf(Math.round(v))));
  }
  const every = Math.ceil(perDay.length / 8);
  perDay.forEach((d, i) => {
    const x = L + slot * i + (slot - bw) / 2;
    const total = d.answered + d.other;
    const g = sv('g', { class: 'viz-mark' });
    const hit = sv('rect', { x: L + slot * i, y: T, width: slot, height: H - T - B, fill: 'transparent' });
    g.append(hit);
    if (d.answered) g.append(sv('rect', { x, y: y(d.answered) + (d.other ? 0 : 0), width: bw, height: Math.max(0, y(0) - y(d.answered)), rx: 3, class: 'viz-s1' }));
    if (d.other) g.append(sv('rect', { x, y: y(total), width: bw, height: Math.max(0, y(d.answered) - y(total) - (d.answered ? 2 : 0)), rx: 3, class: 'viz-s2' }));
    tip(g, `${dayLabel(d.date)}: ${d.answered + d.other} samtal, varav ${d.answered} besvarade`);
    svg.append(g);
    if (i % every === 0 || i === perDay.length - 1) svg.append(sv('text', { x: x + bw / 2, y: H - 8, class: 'viz-tick', 'text-anchor': 'middle' }, dayLabel(d.date)));
  });
  box.prepend(svg);
  return box;
}

// Staplar för en andel (svarsfrekvens) per timme eller veckodag. Få samtal => ljusare stapel.
function rateChart(items, label, key, minCalls = 5) {
  const W = 340; const H = 170; const L = 30; const B = 24; const T = 8;
  const slot = (W - L - 4) / items.length;
  const bw = Math.min(24, slot * 0.7);
  const y = (v) => T + (H - T - B) * (1 - v / 100);
  const box = el('div', { class: 'viz-wrap' });
  const tip = withTip(box);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-svg', role: 'img', 'aria-label': label });
  for (const v of [0, 50, 100]) svg.append(sv('line', { x1: L, x2: W - 4, y1: y(v), y2: y(v), class: v === 0 ? 'viz-base' : 'viz-grid' }), sv('text', { x: L - 5, y: y(v) + 4, class: 'viz-tick', 'text-anchor': 'end' }, v + '%'));
  items.forEach((it, i) => {
    const x = L + slot * i + (slot - bw) / 2;
    const g = sv('g', { class: 'viz-mark' });
    g.append(sv('rect', { x: L + slot * i, y: T, width: slot, height: H - T - B, fill: 'transparent' }));
    if (it.answerRate !== null && it.calls > 0) g.append(sv('rect', { x, y: y(it.answerRate), width: bw, height: Math.max(1, y(0) - y(it.answerRate)), rx: 3, class: it.calls >= minCalls ? 'viz-s1' : 'viz-s1 viz-faint' }));
    tip(g, it.calls ? `${it[key]}: ${pct(it.answerRate)} svarade (${it.answered} av ${it.calls} samtal)${it.calls < minCalls ? ', för få samtal för att dra slutsatser' : ''}` : `${it[key]}: inga samtal`);
    svg.append(g, sv('text', { x: x + bw / 2, y: H - 8, class: 'viz-tick', 'text-anchor': 'middle' }, it.short ?? it[key]));
  });
  box.prepend(svg);
  return box;
}

// Vågräta staplar i HTML: etikett, stapel och värde. step = klassen som ger färgen.
function hbars(rows, { stepClass = () => 'viz-s1', total = null } = {}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return el('div', { class: 'hbars' }, rows.map((r, i) => {
    const bar = el('div', { class: 'hbar ' + stepClass(i) });
    bar.style.width = (r.count / max) * 100 + '%';
    return el('div', { class: 'hrow' },
      el('div', { class: 'hlabel' }, r.label),
      el('div', { class: 'htrack' }, bar),
      el('div', { class: 'hval' }, nf(r.count), total ? el('span', { class: 'muted' }, ` · ${Math.round((r.count / total) * 100)} %`) : null, r.note ? el('span', { class: 'muted' }, ' ' + r.note) : null));
  }));
}

function insights(d) {
  const out = [];
  const hours = d.byHour.filter((h) => h.calls >= 10 && h.answerRate !== null);
  if (hours.length >= 2) {
    const best = hours.reduce((a, b) => (b.answerRate > a.answerRate ? b : a));
    const worst = hours.reduce((a, b) => (b.answerRate < a.answerRate ? b : a));
    if (best.hour !== worst.hour) out.push(`Flest svarar klockan ${String(best.hour).padStart(2, '0')}–${String(best.hour + 1).padStart(2, '0')} (${pct(best.answerRate)}). Sämst är ${String(worst.hour).padStart(2, '0')}–${String(worst.hour + 1).padStart(2, '0')} (${pct(worst.answerRate)}). Lägg samtalen när fler svarar.`);
  }
  const days = d.byWeekday.filter((x) => x.calls >= 10 && x.answerRate !== null);
  if (days.length >= 2) {
    const best = days.reduce((a, b) => (b.answerRate > a.answerRate ? b : a));
    out.push(`Bästa veckodag att nå någon: ${best.day.toLowerCase()} (${pct(best.answerRate)} svarade).`);
  }
  const secs = d.bySection.filter((s) => s.id !== '?' && s.answered >= 5 && s.calls >= 10);
  if (secs.length >= 2) {
    const best = secs.reduce((a, b) => ((b.meetings + b.quotes) / b.calls > (a.meetings + a.quotes) / a.calls ? b : a));
    if (best.meetings + best.quotes > 0) out.push(`Branschen som oftast leder till möte eller offert: ${best.label.toLowerCase()} (${best.meetings + best.quotes} av ${best.calls} samtal). Överväg att satsa mer där.`);
  }
  const t = d.totals;
  if (t.calls >= 20 && t.answerRate !== null && t.answerRate < 25) out.push(`Bara ${pct(t.answerRate)} svarar. Testa andra tider eller att ringa samma lead flera gånger.`);
  if (t.answered >= 10 && t.meetings + t.quotes === 0) out.push('Många svarar men ingen bokar möte eller vill ha offert. Se över erbjudandet och hur samtalet öppnas.');
  return out;
}

const kr0 = (v) => `${nf(Math.round(v || 0))} kr`;

// Statistik utifrån Leadtavlan
function boardSection(b, days) {
  const tile = (label, value, sub) => el('div', { class: 'stat' }, el('b', null, value), el('span', null, label), sub && el('small', { class: 'muted' }, sub));
  const t = b.totals;
  if (t.leads === 0) {
    return [el('div', { class: 'card' }, el('div', { class: 'empty' }, el('h3', null, 'Leadtavlan är tom'), el('p', null, 'Lägg företag i tavlan så visas hur långt de kommer här.')))];
  }
  const stepOf = { ny: 'viz-o1', kontaktad: 'viz-o2', mote: 'viz-o3', offert: 'viz-o4', vunnen: 'viz-s1', ejaktuell: 'viz-s2' };
  const tiles = el('div', { class: 'stats' },
    tile('Leads i tavlan', nf(t.leads), `${nf(t.open)} pågående`),
    tile(`Nya senaste ${days} dagarna`, nf(t.added)),
    tile('Försenade uppföljningar', nf(t.overdue), 'nästa datum har passerat'),
    tile('Vunna', nf(t.won), t.winRate !== null ? `${pct(t.winRate)} av alla leads` : null),
    tile('Värde i pipeline', kr0(t.pipelineValue), 'pågående leads med värde'),
    tile('Vunnet värde', kr0(t.wonValue)));
  const funnelRows = b.funnel.map((f, i) => ({ label: f.label, count: f.count, note: i > 0 && b.funnel[i - 1].count ? `(${Math.round((f.count / b.funnel[i - 1].count) * 100)} % av föregående)` : '' }));
  const table = (title, sub, firstCol, rows) => rows.length ? card(title, sub, el('div', { class: 'table-wrap' }, el('table', null,
    el('thead', null, el('tr', null, [firstCol, 'Leads', 'Kontaktade', 'Möten', 'Offerter', 'Vunna', 'Ej aktuella', 'Vinstandel'].map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', null, rows.map((g) => el('tr', null, el('td', null, g.name), el('td', null, nf(g.leads)), el('td', null, nf(g.contacted)), el('td', null, nf(g.meetings)), el('td', null, nf(g.quotes)), el('td', null, nf(g.won)), el('td', null, nf(g.lost)), el('td', null, pct(g.winRate)))))))) : null;
  return [
    el('h2', { class: 'stats-sep' }, 'Leadtavlan'), tiles,
    el('div', { class: 'grid-2 viz-pair' },
      card('Var leadsen ligger nu', 'Antal per kolumn i tavlan', hbars(b.stages.map((s) => ({ label: s.label, count: s.count, note: s.value ? `· ${kr0(s.value)}` : '' })), { stepClass: (i) => stepOf[b.stages[i].id], total: t.leads })),
      card('Hur långt de har kommit', 'Leads som någon gång nått steget, även de som senare blev ej aktuella', hbars(funnelRows, { stepClass: (i) => ['viz-o1', 'viz-o2', 'viz-o3', 'viz-o4', 'viz-s1'][i] }))),
    table('Per lista', 'Hur varje kampanj presterar. Jämför listorna för att se vilken målgrupp som ger mest.', 'Lista', b.byGroup),
    table('Per ansvarig', 'Hur leadsen fördelas och hur långt de kommer per säljare', 'Ansvarig', b.byOwner),
  ];
}

export function renderStats(root, data, { period, userId, onPeriod, onUser }) {
  const t = data.totals;
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Period' }, PERIODS.map(([d, l]) => el('button', { type: 'button', 'aria-pressed': String(d === period), onclick: () => onPeriod(d) }, l)));
  const userSel = data.scope !== 'me' ? el('select', { 'aria-label': 'Säljare', onchange: (e) => onUser(e.target.value) },
    el('option', { value: '' }, 'Hela teamet'), data.users.map((u) => el('option', { value: String(u.id), selected: String(u.id) === String(userId) }, u.name))) : null;

  const tile = (label, value, sub) => el('div', { class: 'stat' }, el('b', null, value), el('span', null, label), sub && el('small', { class: 'muted' }, sub));
  const tiles = el('div', { class: 'stats' },
    tile('Samtal', nf(t.calls)), tile('Svarsfrekvens', pct(t.answerRate), t.answered ? `${nf(t.answered)} svarade` : null),
    tile('Möten bokade', nf(t.meetings)), tile('Vill ha offert', nf(t.quotes)),
    tile('Snittlängd', dur(t.avgSeconds), 'besvarade samtal'), tile('Total samtalstid', dur(t.talkSeconds)));

  clear(root).append(
    el('div', { class: 'page-head' },
      el('div', null, el('h1', null, 'Statistik'), el('p', null, data.scope === 'me' ? 'Dina samtal och vad de leder till.' : data.scope === 'user' ? 'Samtal för vald säljare.' : 'Teamets samtal och vad de leder till.')),
      el('div', { class: 'row' }, userSel, seg)));

  root.append(...boardSection(data.board, data.days).filter(Boolean));
  root.append(el('h2', { class: 'stats-sep' }, 'Samtal'));

  if (t.calls === 0) {
    root.append(el('div', { class: 'card' }, el('div', { class: 'empty' }, el('h3', null, 'Inga samtal under perioden'), el('p', null, 'Ring från Leadtavlan eller ett företag så fylls statistiken på. Välj en längre period för att se äldre samtal.'))));
    return;
  }

  const tips = insights(data);
  const hoursShown = (() => {
    const used = data.byHour.filter((h) => h.calls > 0).map((h) => h.hour);
    const from = Math.min(8, ...used); const to = Math.max(17, ...used);
    return data.byHour.filter((h) => h.hour >= from && h.hour <= to).map((h) => ({ ...h, label: `${String(h.hour).padStart(2, '0')}–${String(h.hour + 1).padStart(2, '0')}`, short: String(h.hour).padStart(2, '0') }));
  })();
  const funnelStep = ['viz-o1', 'viz-o2', 'viz-o3', 'viz-o4'];
  const funnelRows = data.funnel.map((f, i) => ({ label: f.label, count: f.count, note: i > 0 && data.funnel[i - 1].count ? `(${Math.round((f.count / data.funnel[i - 1].count) * 100)} % av föregående)` : '' }));

  root.append(tiles,
    tips.length ? el('div', { class: 'card viz' }, el('h2', null, 'Det här kan du ändra'), el('ul', { class: 'insights' }, tips.map((x) => el('li', null, x)))) : null,
    card('Samtal per dag', `De senaste ${Math.min(data.days, 90)} dagarna`,
      legend([['viz-s1', 'Svarade'], ['viz-s2', 'Svarade ej eller övrigt']]), dayChart(data.perDay),
      tableView(['Datum', 'Svarade', 'Övriga'], data.perDay.map((d) => [dayLabel(d.date), d.answered, d.other]))),
    el('div', { class: 'grid-2 viz-pair' },
      card('Hur samtalen slutar', 'Alla utfall i perioden', hbars(data.outcomes, { total: t.calls })),
      card('Från samtal till affär', 'Hur många som tar sig vidare', hbars(funnelRows, { stepClass: (i) => funnelStep[i] }))),
    el('div', { class: 'grid-2 viz-pair' },
      card('När svarar de?', 'Andel som svarade, per timme. Ljusa staplar har färre än 5 samtal.',
        rateChart(hoursShown, 'Svarsfrekvens per timme på dygnet', 'label'),
        tableView(['Timme', 'Samtal', 'Svarade', 'Svarsfrekvens'], hoursShown.map((h) => [h.label, h.calls, h.answered, pct(h.answerRate)]))),
      card('Vilken dag?', 'Andel som svarade, per veckodag.',
        rateChart(data.byWeekday.map((w) => ({ ...w, short: w.day })), 'Svarsfrekvens per veckodag', 'day'),
        tableView(['Dag', 'Samtal', 'Svarade', 'Svarsfrekvens'], data.byWeekday.map((w) => [w.day, w.calls, w.answered, pct(w.answerRate)])))),
    data.bySection.length ? card('Branscher', 'Vilka branscher som svarar och bokar möten', el('div', { class: 'table-wrap' }, el('table', null,
      el('thead', null, el('tr', null, ['Bransch', 'Samtal', 'Svarsfrekvens', 'Möten', 'Offerter'].map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', null, data.bySection.map((s) => el('tr', null, el('td', null, s.id !== '?' ? `${s.id} · ${s.label}` : s.label), el('td', null, nf(s.calls)), el('td', null, pct(s.answerRate)), el('td', null, nf(s.meetings)), el('td', null, nf(s.quotes)))))))) : null,
    data.byUser.length ? card('Per säljare', 'Vem som ringer hur mycket och vad det leder till', el('div', { class: 'table-wrap' }, el('table', null,
      el('thead', null, el('tr', null, ['Säljare', 'Samtal', 'Svarsfrekvens', 'Möten', 'Offerter', 'Snittlängd'].map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', null, data.byUser.map((u) => el('tr', null, el('td', null, u.name), el('td', null, nf(u.calls)), el('td', null, pct(u.answerRate)), el('td', null, nf(u.meetings)), el('td', null, nf(u.quotes)), el('td', null, dur(u.avgSeconds)))))))) : null);
}
