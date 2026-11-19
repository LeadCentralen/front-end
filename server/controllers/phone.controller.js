import { PhoneLink } from '../services/phone-link.service.js';
import { PlanService } from '../services/plan.service.js';

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const PhoneController = {
  // Inloggad användare (datorn)
  pairCode: (ctx) => { PlanService.requirePhone(ctx.user); return PhoneLink.createCode(ctx.user.id); },
  status: (ctx) => PhoneLink.status(ctx.user.id),
  unpair: (ctx) => { PhoneLink.unpair(ctx.user.id); return { ok: true }; },
  dial: (ctx) => { PlanService.requirePhone(ctx.user); return PhoneLink.dial(ctx.user.id, text(ctx.body.name, 80), text(ctx.body.number, 30)); },
  call: (ctx) => PhoneLink.callStatus(ctx.user.id, ctx.params.id),

  // Telefonen (egen nyckel, ingen inloggning)
  pair: (ctx) => PhoneLink.pair(text(ctx.body.code, 12), text(ctx.body.name, 60), ctx.ip),
  poll: (ctx) => PhoneLink.poll(PhoneLink.phoneFromReq(ctx.req)),
  report: (ctx) => PhoneLink.report(PhoneLink.phoneFromReq(ctx.req), text(ctx.body.callId, 60), text(ctx.body.state, 20), ctx.body.seconds),
};
