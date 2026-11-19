import { el } from '../utils/dom.js';
import { state as app } from '../state.js';
import { PhoneModel } from '../models/phone.model.js';
import { openPhoneGuide } from './phone-guide.view.js';
import { openPhonePairing } from './phone-pair.view.js';

const FOLLOW_UPS = [[0, 'Ingen'], [1, 'Imorgon'], [3, 'Om 3 dagar'], [7, 'Om en vecka'], [14, 'Om 2 veckor']];
const stageName = (id) => app.config?.stages?.find((s) => s.id === id)?.label || id;

export const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
export const fmtLength = (s) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`);

// Samtalsrad. Man kan bara ringa när en telefon är ansluten (Telefonlänk). Då kommer starten och sluttiden från
// telefonen själv, så samtalstiden i loggen är verklig. Utfall och anteckning sparas på leaden.
// h = { onDone({ outcome, seconds, note, followUpDays }), onCancel() }
export function renderCallPanel({ company, history = [] }, h) {
  const idle = !company;
  const c = company || { name: '', phone: '' };
  let state = 'ready'; // ready -> sending -> active -> wrap
  let seconds = 0;
  let measured = false; // tiden kommer från telefonen
  let timer = null;
  let remoteId = null;
  let remotePoll = null;
  let statusPoll = null;
  let online = false;
  let phoneName = '';
  let outcome = '';
  let followUp = 0;

  const root = el('section', { class: 'callbar', 'aria-label': 'Samtal' });
  const conn = el('div', { class: 'cb-conn' });
  const who = el('div', { class: 'cb-who' });
  const clock = el('div', { class: 'cb-clock', 'aria-live': 'off' }, '00:00');
  const clockLabel = el('div', { class: 'cb-clock-l' });
  const actions = el('div', { class: 'cb-actions' });
  const wrap = el('div', { class: 'cb-wrap' });
  const note = el('textarea', { maxLength: 1500, placeholder: 'Anteckning om samtalet (valfritt)', 'aria-label': 'Anteckning om samtalet' });
  const err = el('p', { class: 'error', role: 'alert' });
  const when = (iso) => new Date(iso).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const logBox = el('details', { class: 'cb-log' },
    el('summary', null, `Senaste samtal (${history.length})`),
    history.length === 0
      ? el('p', { class: 'muted small' }, 'Inga samtal ännu.')
      : el('ul', null, history.map((a) => el('li', null,
        el('span', { class: 'cb-log-main' }, a.company ? el('strong', null, a.company + ' ') : null, a.text || 'Samtal'),
        el('span', { class: 'cb-log-time' }, when(a.created_at))))));

  const stopTimer = () => { if (timer) clearInterval(timer); timer = null; };
  const startTimer = () => { if (!timer) timer = setInterval(() => { seconds += 1; clock.textContent = fmtClock(seconds); }, 1000); };
  const stopAll = () => { stopTimer(); clearInterval(remotePoll); clearInterval(statusPoll); remotePoll = statusPoll = null; };
  const isActive = () => state === 'sending' || state === 'active' || (state === 'wrap' && !root.dataset.done);

  function drawConn() {
    conn.replaceChildren(
      el('span', { class: 'cb-dot' + (online ? ' on' : ''), 'aria-hidden': 'true' }),
      el('div', null,
        el('div', { class: 'cb-conn-t' }, online ? 'Telefon ansluten' : 'Ingen telefon ansluten'),
        el('div', { class: 'cb-conn-s' }, online ? (phoneName || 'Samtalen går i din telefon') : 'Anslut för att kunna ringa')),
      el('div', { class: 'cb-conn-b' },
        el('button', { type: 'button', class: 'btn small' + (online ? '' : ' primary'), onclick: () => openPhonePairing(refreshLink) }, online ? 'Hantera' : 'Anslut telefon'),
        el('button', { type: 'button', class: 'btn small ghost', onclick: openPhoneGuide }, 'Guide')));
  }
  async function refreshLink() {
    try { const s = await PhoneModel.status(); online = s.connected; phoneName = s.name || ''; } catch { online = false; }
    drawConn();
    if (state === 'ready') draw();
  }
  function startStatusPoll() {
    clearInterval(statusPoll);
    refreshLink();
    statusPoll = setInterval(() => { if (!root.isConnected) return stopAll(); if (state === 'ready') refreshLink(); }, 8000);
  }

  async function dial() {
    if (!online) { openPhonePairing(refreshLink); return; }
    state = 'sending'; measured = false; seconds = 0; clock.textContent = '00:00';
    draw();
    try {
      remoteId = (await PhoneModel.dial(c.name, c.phone)).callId;
    } catch (e) {
      state = 'ready'; online = false; drawConn(); draw(); err.textContent = e.message; return;
    }
    remotePoll = setInterval(async () => {
      try {
        const r = await PhoneModel.call(remoteId);
        if (r.state === 'opened' && state === 'sending') { state = 'active'; draw(); startTimer(); }
        if (r.state === 'returned') {
          clearInterval(remotePoll); remotePoll = null; stopTimer();
          if (r.seconds > 0) { seconds = r.seconds; measured = true; clock.textContent = fmtClock(seconds); }
          toWrap();
        }
      } catch { /* försöker igen */ }
    }, 1500);
  }
  function toWrap() {
    stopTimer(); clearInterval(remotePoll); remotePoll = null;
    state = 'wrap';
    draw();
  }
  function submit() {
    if (!outcome) { err.textContent = 'Välj hur samtalet gick.'; return; }
    err.textContent = '';
    root.dataset.done = '1';
    h.onDone({ outcome, seconds, note: note.value.trim(), followUpDays: followUp });
  }

  function draw() {
    actions.replaceChildren();
    wrap.replaceChildren();
    wrap.hidden = state !== 'wrap';
    const label = { ready: 'Samtalstid', sending: 'Väntar på telefonen', active: 'Pågår (tid från telefonen)', wrap: measured ? 'Samtalstid (från telefonen)' : 'Samtalstid (uppskattad)' }[state];
    clockLabel.textContent = label;
    root.dataset.state = state;
    if (idle) {
      who.replaceChildren(el('div', { class: 'cb-name muted' }, 'Inget samtal valt'), el('div', { class: 'cb-num' }, 'Klicka på 📞 på ett kort i tavlan för att ringa.'));
      return;
    }
    const hint = { ready: online ? 'Tryck på Ring. Numret skickas till din telefon.' : 'Anslut telefonen först. Då får samtalet en verklig tid i loggen.',
      sending: 'Skickat. Tryck på Ring i telefonen.', active: 'Samtal pågår i din telefon.', wrap: 'Samtalet är slut. Hur gick det?' }[state];
    who.replaceChildren(el('div', { class: 'cb-name' }, c.name), el('div', { class: 'cb-num' }, c.phone), el('div', { class: 'cb-hint' }, hint), err);
    if (state === 'ready') {
      actions.append(
        online
          ? el('button', { type: 'button', class: 'btn primary cb-go', onclick: dial }, '📞 Ring')
          : el('button', { type: 'button', class: 'btn primary cb-go', onclick: () => openPhonePairing(refreshLink) }, 'Anslut telefon för att ringa'),
        el('button', { type: 'button', class: 'btn ghost', onclick: h.onCancel }, 'Avbryt'));
    } else if (state === 'sending') {
      actions.append(el('button', { type: 'button', class: 'btn ghost', onclick: () => { stopAll(); state = 'ready'; draw(); startStatusPoll(); } }, 'Avbryt'));
    } else if (state === 'active') {
      actions.append(el('button', { type: 'button', class: 'btn ghost small', title: 'Använd om telefonen inte rapporterar tillbaka', onclick: toWrap }, 'Avsluta manuellt'));
    } else {
      const outcomes = app.config?.callOutcomes || [];
      const fups = el('div', { class: 'chips', role: 'group', 'aria-label': 'Ring igen' }, FOLLOW_UPS.map(([d, l]) => el('button', {
        type: 'button', class: 'chipbtn', 'aria-pressed': String(d === followUp), dataset: { days: String(d) },
        onclick: () => { followUp = d; markFollowUp(); },
      }, l)));
      const markFollowUp = () => [...fups.children].forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.days) === followUp)));
      const chips = el('div', { class: 'chips outcomes', role: 'group', 'aria-label': 'Utfall' }, outcomes.map((o) => el('button', {
        type: 'button', class: 'chipbtn outcome', 'aria-pressed': String(o.id === outcome), dataset: { id: o.id },
        onclick: () => {
          outcome = o.id; followUp = o.followUpDays || 0; markFollowUp(); err.textContent = '';
          [...chips.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === o.id)));
        },
      }, el('span', null, o.label), el('small', null, o.stage ? '→ ' + stageName(o.stage) : 'stannar kvar'))));
      wrap.append(
        el('div', { class: 'cb-wrap-col' }, el('div', { class: 'cb-lbl' }, 'Hur gick samtalet? Leaden flyttas i tavlan'), chips, el('div', { class: 'cb-lbl' }, 'Ring igen'), fups),
        el('div', { class: 'cb-wrap-col' }, note,
          el('div', { class: 'row' },
            el('button', { class: 'btn primary', type: 'button', onclick: submit }, 'Logga samtalet'),
            el('button', { class: 'btn ghost', type: 'button', onclick: () => { if (confirm('Kasta samtalet utan att logga det?')) h.onCancel(); } }, 'Kasta'))));
    }
  }

  root.append(
    el('div', { class: 'cb-main' }, conn, who, el('div', { class: 'cb-timer' }, clock, clockLabel), actions),
    wrap, logBox);
  drawConn();
  draw();
  startStatusPoll();
  return { el: root, isActive, destroy: stopAll };
}
