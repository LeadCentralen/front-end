import { HttpError } from '../core/http-error.js';
import { ACTIVITY_TYPES } from '../config/constants.js';
import { LeadModel } from '../models/lead.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { LeadService } from '../services/lead.service.js';
import { PlanService } from '../services/plan.service.js';
import { CompanyModel } from '../models/company.model.js';
import { normOrgnr } from '../services/import/record-mapper.js';

export const LeadController = {
  index: (ctx) => ({ leads: LeadModel.board(ctx.user.org_id) }),
  logCall: (ctx) => LeadService.logCall(ctx.user, ctx.params.id, ctx.body),
  bulkPreview: (ctx) => LeadService.bulkPreview(ctx.user, ctx.body.filters),
  bulkAdd: (ctx) => LeadService.bulkAdd(ctx.user, ctx.body.filters, ctx.body.group, ctx.body.limit),
  recentCalls: (ctx) => ({ calls: ActivityModel.recentCalls(ctx.user.id) }),
  create: (ctx) => LeadService.add(ctx.user, normOrgnr(CompanyModel.resolveRef(ctx.body.orgnr)), ctx.body.stage),
  update(ctx) {
    LeadService.update(ctx.user, ctx.params.id, ctx.body);
    return { ok: true };
  },
  destroy(ctx) {
    const lead = LeadModel.findById(ctx.params.id, ctx.user.org_id);
    LeadModel.delete(ctx.params.id, ctx.user.org_id);
    if (lead) PlanService.refund(ctx.user.org_id, lead.created_at); // ångrat inom 10 minuter: kvoten återställs
    return { ok: true };
  },

  addActivity(ctx) {
    const type = ctx.body.type;
    if (!ACTIVITY_TYPES.includes(type) || type === 'stage') throw new HttpError(400, 'Okänd aktivitetstyp.');
    LeadService.logActivity(ctx.user, ctx.params.id, type, ctx.body.text);
    return { ok: true };
  },
  destroyActivity(ctx) {
    const a = ActivityModel.find(ctx.params.id);
    if (!a || !LeadModel.findById(a.lead_id, ctx.user.org_id)) throw new HttpError(404, 'Hittades inte.');
    if (a.user_id !== ctx.user.id && !['admin', 'owner'].includes(ctx.user.role)) throw new HttpError(403, 'Du kan bara ta bort egna aktiviteter.');
    ActivityModel.delete(a.id);
    return { ok: true };
  },
};
