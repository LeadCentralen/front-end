import { HttpError } from '../core/http-error.js';
import { tx } from '../database/connection.js';
import { STAGE_IDS, stageLabel, CALL_OUTCOMES } from '../config/constants.js';
import { LeadModel } from '../models/lead.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { CompanyModel } from '../models/company.model.js';
import { ScrapeGuard } from './scrape-guard.service.js';
import { PlanService } from './plan.service.js';
import { UserModel } from '../models/user.model.js';

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Utfallet flyttar framåt i tavlan men aldrig bakåt. Ej aktuell gäller alltid. En vunnen kund flyttas inte.
const FORWARD = ['ny', 'kontaktad', 'mote', 'offert'];
function nextStage(current, target) {
  if (target === 'ejaktuell') return 'ejaktuell';
  if (current === 'vunnen') return current;
  if (current === 'ejaktuell') return target;
  return FORWARD.indexOf(target) > FORWARD.indexOf(current) ? target : current;
}

const BULK_MAX = Number(process.env.LIMIT_BULK) > 0 ? Number(process.env.LIMIT_BULK) : 500;
const FILTER_KEYS = ['q', 'county', 'municipality', 'section', 'sni', 'size', 'revenue', 'form', 'status', 'sort'];
// Filtret kommer från sökformuläret. Bara kända fält släpps igenom.
function normFilters(f = {}) {
  const out = {};
  for (const k of FILTER_KEYS) if (typeof f[k] === 'string') out[k] = f[k];
  out.hasPhone = f.hasPhone === true || f.hasPhone === '1' ? '1' : '';
  out.hasEmail = f.hasEmail === true || f.hasEmail === '1' ? '1' : '';
  return out;
}

export const LeadService = {
  // Förhandsvisning av massinläggning: hur många som matchar, hur många som redan ligger i tavlan och hur många som får plats.
  bulkPreview(user, filters) {
    const c = CompanyModel.bulkCounts(normFilters(filters), user.org_id);
    const left = ScrapeGuard.leadsLeft(user);
    const weekLeft = PlanService.left(user.org_id);
    const plan = PlanService.planOf(user.org_id);
    const toAdd = c.total - c.inBoard;
    return { total: c.total, inBoard: c.inBoard, toAdd, left, weekLeft, weekLimit: plan.leadsPerWeek, plan: plan.label, maxPerAction: BULK_MAX, canAdd: Math.max(0, Math.min(toAdd, BULK_MAX, left ?? Infinity, weekLeft ?? Infinity)) };
  },

  // Lägger alla (upp till gränsen) träffar i tavlan i ett svep, märkta med ett listnamn.
  bulkAdd(user, filters, groupName, limit) {
    const f = normFilters(filters);
    const group = text(groupName, 60) || null;
    const left = ScrapeGuard.leadsLeft(user);
    const weekLeft = PlanService.left(user.org_id);
    const cap = Math.min(Math.max(1, Math.floor(Number(limit)) || BULK_MAX), BULK_MAX, left ?? Infinity, weekLeft ?? Infinity);
    PlanService.ensure(user.org_id, 1); // veckokvoten för paketet
    if (cap < 1) ScrapeGuard.beforeLeads(user, 1); // kastar det tydliga dagsgränsmeddelandet
    const orgnrs = CompanyModel.bulkCandidates(f, cap, user.org_id);
    if (!orgnrs.length) return { added: 0 };
    ScrapeGuard.beforeLeads(user, orgnrs.length);
    tx(() => {
      let pos = LeadModel.nextPosition('ny', user.org_id);
      for (const orgnr of orgnrs) {
        const id = LeadModel.create({ orgId: user.org_id, orgnr, stage: 'ny', ownerId: user.id, position: pos++, group });
        ActivityModel.create(id, user.id, 'stage', `Lades till i tavlan (Ny)${group ? ` i listan "${group}"` : ''}`);
      }
    });
    PlanService.consume(user.org_id, orgnrs.length);
    return { added: orgnrs.length, group };
  },

  add(user, orgnr, stage) {
    PlanService.ensure(user.org_id, 1);
    ScrapeGuard.beforeLead(user);
    if (!orgnr || !CompanyModel.existsActive(orgnr)) throw new HttpError(404, 'Företaget hittades inte.');
    const existing = LeadModel.findByOrgnr(orgnr, user.org_id);
    if (existing) return { id: existing.id, existed: true };
    const st = STAGE_IDS.includes(stage) ? stage : 'ny';
    const id = LeadModel.create({ orgId: user.org_id, orgnr, stage: st, ownerId: user.id, position: LeadModel.nextPosition(st, user.org_id) });
    ActivityModel.create(id, user.id, 'stage', `Lades till i tavlan (${stageLabel(st)})`);
    PlanService.consume(user.org_id, 1);
    return { id };
  },

  // PATCH: stage/beforeId (flytt), owner_id, value, next_step, next_date
  update(user, id, b) {
    const lead = LeadModel.findById(id, user.org_id);
    if (!lead) throw new HttpError(404, 'Leadet hittades inte.');
    const upd = {};
    if ('owner_id' in b) {
      if (b.owner_id !== null && !UserModel.exists(b.owner_id, user.org_id)) throw new HttpError(400, 'Okänd användare.');
      upd.owner_id = b.owner_id;
    }
    if ('value' in b) upd.value = b.value === null || b.value === '' ? null : Math.max(0, Math.min(1e12, parseInt(b.value, 10) || 0));
    if ('next_step' in b) upd.next_step = text(b.next_step, 200) || null;
    if ('next_date' in b) {
      if (b.next_date && !/^\d{4}-\d{2}-\d{2}$/.test(b.next_date)) throw new HttpError(400, 'Ogiltigt datum.');
      upd.next_date = b.next_date || null;
    }
    tx(() => {
      if ('stage' in b) {
        if (!STAGE_IDS.includes(b.stage)) throw new HttpError(400, 'Okänt steg.');
        if (b.stage !== lead.stage) ActivityModel.create(lead.id, user.id, 'stage', `${stageLabel(lead.stage)} → ${stageLabel(b.stage)}`);
        upd.stage = b.stage;
        upd.position = LeadModel.positionBefore(b.stage, lead.id, b.beforeId, user.org_id);
      } else if ('beforeId' in b) {
        upd.position = LeadModel.positionBefore(lead.stage, lead.id, b.beforeId, user.org_id);
      }
      LeadModel.update(lead.id, upd);
    });
  },

  // Slutför ett samtal: loggar det, flyttar leaden efter utfallet (aldrig bakåt) och sätter uppföljning.
  logCall(user, id, { outcome, seconds, note, followUpDays }) {
    const lead = LeadModel.findById(id, user.org_id);
    if (!lead) throw new HttpError(404, 'Leadet hittades inte.');
    const o = CALL_OUTCOMES.find((x) => x.id === outcome);
    if (!o) throw new HttpError(400, 'Välj hur samtalet gick.');
    const secs = Math.max(0, Math.min(14400, Math.round(Number(seconds) || 0)));
    const len = secs < 1 ? '' : secs < 60 ? `${secs} s` : `${Math.floor(secs / 60)} min ${secs % 60} s`;
    const days = Math.max(0, Math.min(90, Math.round(Number(followUpDays ?? o.followUpDays) || 0)));
    const target = o.stage ? nextStage(lead.stage, o.stage) : lead.stage;
    tx(() => {
      ActivityModel.createCall(lead.id, user.id, [o.label, len, text(note, 1500)].filter(Boolean).join(' · '), o.id, secs);
      const upd = {};
      if (target !== lead.stage) {
        ActivityModel.create(lead.id, user.id, 'stage', `${stageLabel(lead.stage)} → ${stageLabel(target)}`);
        upd.stage = target;
        upd.position = LeadModel.positionBefore(target, lead.id, null, user.org_id);
      }
      if (days > 0) {
        const d = new Date(Date.now() + days * 86400e3);
        upd.next_step = o.nextStep || 'Ring igen';
        upd.next_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (target === 'ejaktuell') { upd.next_step = null; upd.next_date = null; }
      LeadModel.update(lead.id, upd);
      if (!Object.keys(upd).length) LeadModel.touch(lead.id);
    });
    return { moved: target !== lead.stage ? target : null };
  },

  // Loggar samtal/e-post/möte/anteckning. Första kontakten flyttar leadet från "Ny" till "Kontaktad".
  logActivity(user, id, type, rawText) {
    const lead = LeadModel.findById(id, user.org_id);
    if (!lead) throw new HttpError(404, 'Leadet hittades inte.');
    const txt = text(rawText, 2000);
    if (type === 'note' && !txt) throw new HttpError(400, 'Skriv en anteckning.');
    tx(() => {
      ActivityModel.create(lead.id, user.id, type, txt);
      if (type !== 'note' && lead.stage === 'ny') {
        LeadModel.update(lead.id, { stage: 'kontaktad', position: LeadModel.positionBefore('kontaktad', lead.id, null, user.org_id) });
        ActivityModel.create(lead.id, user.id, 'stage', 'Ny → Kontaktad');
      } else LeadModel.touch(lead.id);
    });
  },
};
