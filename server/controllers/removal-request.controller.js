import { HttpError } from '../core/http-error.js';
import { rateLimit } from '../middleware/rate-limit.middleware.js';
import { RemovalRequestModel } from '../models/removal-request.model.js';
import { normOrgnr } from '../services/import/record-mapper.js';
import { emailOk } from './auth.controller.js';

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const RemovalRequestController = {
  // Öppen: vem som helst kan begära borttagning/spärr via Företagspolicyn
  create(ctx) {
    rateLimit('removal:' + ctx.ip, 5, 3600e3);
    const name = text(ctx.body.name, 120);
    const email = text(ctx.body.email, 120).toLowerCase();
    if (!name || !emailOk(email)) throw new HttpError(400, 'Ange namn och en giltig e-postadress.');
    const orgnr = ctx.body.orgnr ? normOrgnr(ctx.body.orgnr) : null;
    if (ctx.body.orgnr && !orgnr) throw new HttpError(400, 'Ogiltigt organisationsnummer.');
    RemovalRequestModel.create({ orgnr, name, email, message: text(ctx.body.message, 1500) || null });
    return { ok: true };
  },
};
