import { all } from '../database/connection.js';
import { CALL_OUTCOMES, SECTIONS, SECTION_LABELS, STAGES, stageLabel } from '../config/constants.js';

// Samtalsstatistik. Läser samtalen (activities av typen call) och räknar ihop dem i minnet.
// Äldre samtal saknar utfall/sekunder som egna kolumner, så de tolkas ur texten ("Svarade ej · 1 min 5 s · ...").
const ANSWERED = new Set(['spoke', 'callback', 'meeting', 'quote', 'not_interested']);
const UNANSWERED = new Set(['no_answer', 'wrong_number']);
const LABEL_TO_ID = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.label, o.id]));
const TZ = 'Europe/Stockholm';
const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hourCycle: 'h23' });

function parts(iso) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const wd = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'].findIndex((w) => p.weekday.toLowerCase().startsWith(w.slice(0, 3)));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), weekday: wd < 0 ? 0 : wd };
}
function parseSeconds(text) {
  const m = /(?:(\d+) min )?(\d+) s/.exec(text || '');
  return m ? (Number(m[1] || 0) * 60 + Number(m[2])) : 0;
}
function sectionOf(sni) {
  const n = Number(String(sni || '').slice(0, 2));
  if (!n) return null;
  return Object.entries(SECTIONS).find(([, [a, b]]) => n >= a && n <= b)?.[0] || null;
}
const rate = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
const blank = () => ({ calls: 0, answered: 0, unanswered: 0, meetings: 0, quotes: 0, seconds: 0, timed: 0 });
function add(bucket, r) {
  bucket.calls += 1;
  if (r.answered) bucket.answered += 1;
  if (r.unanswered) bucket.unanswered += 1;
  if (r.outcome === 'meeting') bucket.meetings += 1;
  if (r.outcome === 'quote') bucket.quotes += 1;
  if (r.answered && r.seconds > 0) { bucket.seconds += r.seconds; bucket.timed += 1; }
}
const finish = (b) => ({ calls: b.calls, answered: b.answered, answerRate: rate(b.answered, b.answered + b.unanswered), meetings: b.meetings, quotes: b.quotes, avgSeconds: b.timed ? Math.round(b.seconds / b.timed) : null, talkSeconds: b.seconds });

const FLOW = ['ny', 'kontaktad', 'mote', 'offert', 'vunnen'];
const LABEL_TO_STAGE = Object.fromEntries(STAGES.map((s) => [s.label, s.id]));

export const StatsService = {
  // Statistik utifrån Leadtavlan: var leadsen ligger nu, hur långt de har kommit, per lista och per ansvarig.
  // scopeUserId begränsar till leads som användaren är ansvarig för (null = hela tavlan).
  board({ days, scopeUserId, orgId }) {
    const span = [7, 30, 90, 365].includes(days) ? days : 30;
    const since = new Date(Date.now() - span * 86400e3).toISOString();
    const today = parts(new Date().toISOString()).date;
    const args = [orgId, ...(scopeUserId ? [scopeUserId] : [])];
    const leads = all(
      `SELECT l.id, l.stage, l.value, l.next_date, l.group_name, l.owner_id, l.created_at, u.name AS owner_name
         FROM leads l JOIN companies c ON c.orgnr=l.orgnr AND c.suppressed=0 LEFT JOIN users u ON u.id=l.owner_id
       WHERE l.org_id = ? ${scopeUserId ? 'AND l.owner_id = ?' : ''}`, ...args);
    // Längsta steg varje lead har nått, ur flyttloggen (så att "Ej aktuell" fortfarande räknas som kontaktad osv.)
    const reached = new Map(leads.map((l) => [l.id, Math.max(0, FLOW.indexOf(l.stage))]));
    const moves = all(`SELECT a.lead_id, a.text FROM activities a JOIN leads l ON l.id=a.lead_id WHERE a.type='stage' AND l.org_id = ? ${scopeUserId ? 'AND l.owner_id = ?' : ''}`, ...args);
    for (const m of moves) {
      const to = /→ (.+)$/.exec(m.text || '')?.[1] ?? /\((.+)\)$/.exec(m.text || '')?.[1];
      const idx = FLOW.indexOf(LABEL_TO_STAGE[to]);
      if (idx > (reached.get(m.lead_id) ?? -1)) reached.set(m.lead_id, idx);
    }

    const stages = STAGES.map((s) => {
      const items = leads.filter((l) => l.stage === s.id);
      return { id: s.id, label: s.label, count: items.length, value: items.reduce((n, l) => n + (l.value || 0), 0) };
    });
    const funnel = FLOW.map((id, i) => ({ id, label: id === 'ny' ? 'Lades i tavlan' : stageLabel(id), count: leads.filter((l) => reached.get(l.id) >= i).length }));

    const group = (keyOf, nameOf) => {
      const map = new Map();
      for (const l of leads) {
        const k = keyOf(l);
        if (!map.has(k)) map.set(k, { name: nameOf(l), leads: 0, contacted: 0, meetings: 0, quotes: 0, won: 0, lost: 0, value: 0, wonValue: 0 });
        const g = map.get(k); const r = reached.get(l.id);
        g.leads += 1;
        if (r >= 1) g.contacted += 1;
        if (r >= 2) g.meetings += 1;
        if (r >= 3) g.quotes += 1;
        if (l.stage === 'vunnen') { g.won += 1; g.wonValue += l.value || 0; }
        if (l.stage === 'ejaktuell') g.lost += 1;
        if (['mote', 'offert'].includes(l.stage)) g.value += l.value || 0;
      }
      return [...map.values()].map((g) => ({ ...g, winRate: rate(g.won, g.leads) })).sort((a, b) => b.leads - a.leads);
    };

    const open = leads.filter((l) => !['vunnen', 'ejaktuell'].includes(l.stage));
    return {
      totals: {
        leads: leads.length,
        added: leads.filter((l) => l.created_at >= since).length,
        open: open.length,
        overdue: open.filter((l) => l.next_date && l.next_date < today).length,
        won: stages.find((s) => s.id === 'vunnen').count,
        wonValue: stages.find((s) => s.id === 'vunnen').value,
        pipelineValue: open.reduce((n, l) => n + (l.value || 0), 0),
        winRate: rate(stages.find((s) => s.id === 'vunnen').count, leads.length),
      },
      stages, funnel,
      byGroup: group((l) => l.group_name || '', (l) => l.group_name || 'Utan lista').slice(0, 12),
      byOwner: scopeUserId ? [] : group((l) => l.owner_id ?? 0, (l) => l.owner_name || 'Ingen ansvarig'),
    };
  },

  // scopeUserId: begränsar till en användare (null = alla). days: 7, 30, 90 eller 365.
  calls({ days, scopeUserId, orgId }) {
    const span = [7, 30, 90, 365].includes(days) ? days : 30;
    const since = new Date(Date.now() - span * 86400e3).toISOString();
    const rows = all(
      `SELECT a.created_at, a.user_id, u.name AS user_name, a.text, a.outcome, a.seconds, c.sni
         FROM activities a JOIN leads l ON l.id=a.lead_id
         LEFT JOIN companies c ON c.orgnr=l.orgnr LEFT JOIN users u ON u.id=a.user_id
        WHERE a.type='call' AND a.created_at >= ? AND l.org_id = ? ${scopeUserId ? 'AND a.user_id = ?' : ''}
        ORDER BY a.created_at`, since, orgId, ...(scopeUserId ? [scopeUserId] : []));

    const total = blank();
    const days_ = new Map();
    const outcomes = new Map(CALL_OUTCOMES.map((o) => [o.id, 0]));
    outcomes.set('other', 0);
    const byHour = Array.from({ length: 24 }, blank);
    const byWeekday = Array.from({ length: 7 }, blank);
    const byUser = new Map();
    const bySection = new Map();

    for (const x of rows) {
      const first = (x.text || '').split(' · ')[0];
      const outcome = x.outcome || LABEL_TO_ID[first] || 'other';
      const r = { outcome, answered: ANSWERED.has(outcome), unanswered: UNANSWERED.has(outcome), seconds: x.seconds ?? parseSeconds(x.text) };
      const t = parts(x.created_at);
      add(total, r);
      outcomes.set(outcome, (outcomes.get(outcome) || 0) + 1);
      add(byHour[t.hour], r);
      add(byWeekday[t.weekday], r);
      if (!days_.has(t.date)) days_.set(t.date, { date: t.date, answered: 0, other: 0 });
      days_.get(t.date)[r.answered ? 'answered' : 'other'] += 1;
      if (!byUser.has(x.user_id)) byUser.set(x.user_id, { name: x.user_name || 'Borttagen användare', ...blank() });
      add(byUser.get(x.user_id), r);
      const sec = sectionOf(x.sni) || '?';
      if (!bySection.has(sec)) bySection.set(sec, blank());
      add(bySection.get(sec), r);
    }

    // En stapel per dag, även dagar utan samtal (högst 90 staplar, annars grupperas inte, utan de sista 90 dagarna visas)
    const perDay = [];
    const shown = Math.min(span, 90);
    for (let i = shown - 1; i >= 0; i--) {
      const date = parts(new Date(Date.now() - i * 86400e3).toISOString()).date;
      perDay.push(days_.get(date) || { date, answered: 0, other: 0 });
    }

    return {
      days: span,
      totals: {
        ...finish(total),
        unanswered: total.unanswered,
        notInterested: outcomes.get('not_interested') || 0,
      },
      perDay,
      outcomes: [...outcomes].map(([id, count]) => ({ id, label: id === 'other' ? 'Övrigt (äldre samtal)' : CALL_OUTCOMES.find((o) => o.id === id).label, count })).filter((o) => o.count > 0 || o.id !== 'other'),
      funnel: [
        { id: 'calls', label: 'Samtal', count: total.calls },
        { id: 'answered', label: 'Svarade', count: total.answered },
        { id: 'meetings', label: 'Möte bokat', count: total.meetings },
        { id: 'quotes', label: 'Vill ha offert', count: total.quotes },
      ],
      byHour: byHour.map((b, hour) => ({ hour, calls: b.calls, answered: b.answered, answerRate: rate(b.answered, b.answered + b.unanswered) })),
      byWeekday: byWeekday.map((b, i) => ({ day: ['Mån', 'Tis', 'Ons', 'Tors', 'Fre', 'Lör', 'Sön'][i], calls: b.calls, answered: b.answered, answerRate: rate(b.answered, b.answered + b.unanswered) })),
      byUser: scopeUserId ? [] : [...byUser].map(([id, b]) => ({ id, name: b.name, ...finish(b) })).sort((a, b) => b.calls - a.calls),
      bySection: [...bySection].map(([id, b]) => ({ id, label: id === '?' ? 'Okänd bransch' : SECTION_LABELS[id], ...finish(b) })).sort((a, b) => b.calls - a.calls).slice(0, 8),
    };
  },
};
