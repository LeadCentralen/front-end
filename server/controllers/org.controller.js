import { HttpError } from '../core/http-error.js';
import { UserModel } from '../models/user.model.js';
import { OrgModel } from '../models/org.model.js';
import { SessionModel } from '../models/session.model.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { PasswordService } from '../services/password.service.js';
import { PlanService } from '../services/plan.service.js';
import { PLANS } from '../config/constants.js';
import { emailOk } from './auth.controller.js';

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const isManager = (user) => user.role === 'admin' || user.role === 'owner';
function requireManager(user) {
  if (!isManager(user)) throw new HttpError(403, 'Bara kontoägare kan hantera organisationen.');
}
// Medlemmen måste tillhöra samma organisation som den som gör ändringen
function member(ctx) {
  const m = UserModel.findById(ctx.params.id);
  if (!m || m.org_id !== ctx.user.org_id) throw new HttpError(404, 'Användaren hittades inte.');
  return m;
}

export const OrgController = {
  // Organisationen och dess användare (kontoägare)
  show(ctx) {
    requireManager(ctx.user);
    const org = OrgModel.findById(ctx.user.org_id);
    const members = OrgModel.members(org.id);
    const plan = PLANS[org.plan] || PLANS.start;
    return { plan: { ...PlanService.usage(org.id), trialEndsAt: org.trial_ends_at, price: plan.price, extraSeat: plan.extraSeat, includedSeats: plan.seats }, org: { id: org.id, name: org.name, orgnr: org.orgnr, contact_email: org.contact_email, phone: org.phone, seats: org.seats, used: members.length }, members };
  },

  update(ctx) {
    requireManager(ctx.user);
    const name = text(ctx.body.name, 120);
    const email = text(ctx.body.contact_email, 120).toLowerCase();
    if (!name) throw new HttpError(400, 'Ange företagsnamn.');
    if (email && !emailOk(email)) throw new HttpError(400, 'Ange en giltig e-postadress.');
    OrgModel.update(ctx.user.org_id, { name, email, phone: text(ctx.body.phone, 40) });
    AuditLogModel.record(ctx.user.id, 'org_update', name);
    return { ok: true };
  },

  addMember(ctx) {
    requireManager(ctx.user);
    const org = OrgModel.findById(ctx.user.org_id);
    const email = text(ctx.body.email, 120).toLowerCase();
    const name = text(ctx.body.name, 80);
    if (!name || !emailOk(email)) throw new HttpError(400, 'Ange namn och en giltig e-postadress.');
    const bad = PasswordService.validate(ctx.body.password);
    if (bad) throw new HttpError(400, bad);
    if (OrgModel.memberCount(org.id) >= org.seats) throw new HttpError(402, `Ni har använt alla ${org.seats} användarplatser. Kontakta oss för att utöka antalet.`);
    if (UserModel.findByEmail(email)) throw new HttpError(409, 'E-postadressen används redan.');
    UserModel.create({ email, name, pwHash: PasswordService.hash(ctx.body.password), role: ctx.body.role === 'owner' ? 'owner' : 'user', orgId: org.id });
    AuditLogModel.record(ctx.user.id, 'user_create', email);
    return { ok: true };
  },

  removeMember(ctx) {
    requireManager(ctx.user);
    const m = member(ctx);
    if (m.id === ctx.user.id) throw new HttpError(400, 'Du kan inte ta bort dig själv här. Använd "Ta bort mitt konto".');
    if (m.role === 'admin') throw new HttpError(403, 'Plattformsadministratören kan inte tas bort här.');
    UserModel.delete(m.id);
    AuditLogModel.record(ctx.user.id, 'user_delete', m.email);
    return { ok: true };
  },

  reinstateMember(ctx) {
    requireManager(ctx.user);
    const m = member(ctx);
    UserModel.reinstate(m.id);
    AuditLogModel.record(ctx.user.id, 'user_reinstate', m.email);
    return { ok: true };
  },

  // Byt lösenord åt en kollega som glömt sitt. Loggar ut kollegan överallt.
  resetPassword(ctx) {
    requireManager(ctx.user);
    const m = member(ctx);
    if (m.role === 'admin' && ctx.user.role !== 'admin') throw new HttpError(403, 'Saknar behörighet.');
    const bad = PasswordService.validate(ctx.body.password);
    if (bad) throw new HttpError(400, bad);
    UserModel.updatePassword(m.id, PasswordService.hash(ctx.body.password));
    SessionModel.deleteForUser(m.id);
    AuditLogModel.record(ctx.user.id, 'user_password_reset', m.email);
    return { ok: true };
  },
};
