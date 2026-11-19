import { HttpError } from '../core/http-error.js';
import { SuppressionModel } from '../models/suppression.model.js';
import { RemovalRequestModel } from '../models/removal-request.model.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { SuppressionService } from '../services/suppression.service.js';
import { normOrgnr } from '../services/import/record-mapper.js';

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const SuppressionController = {
  index: () => ({ list: SuppressionModel.list(), requests: RemovalRequestModel.list() }),
  create(ctx) {
    const orgnr = normOrgnr(ctx.body.orgnr);
    if (!orgnr) throw new HttpError(400, 'Ogiltigt organisationsnummer.');
    SuppressionService.suppress(orgnr, text(ctx.body.reason, 200));
    AuditLogModel.record(ctx.user.id, 'suppress', orgnr);
    if (ctx.body.requestId) RemovalRequestModel.markHandled(ctx.body.requestId);
    return { ok: true };
  },
  destroy(ctx) {
    SuppressionService.release(ctx.params.orgnr);
    AuditLogModel.record(ctx.user.id, 'unsuppress', ctx.params.orgnr);
    return { ok: true };
  },
  markRequestHandled(ctx) {
    RemovalRequestModel.markHandled(ctx.params.id);
    return { ok: true };
  },
};
