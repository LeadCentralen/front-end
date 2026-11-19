import { HttpError } from '../core/http-error.js';
import { UserModel } from '../models/user.model.js';
import { OrgModel } from '../models/org.model.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { PLANS, TRIAL_DAYS } from '../config/constants.js';

export const UserController = {
  // Alla inloggade: namn att välja som ansvarig på ett lead (bara den egna organisationen)
  index: (ctx) => UserModel.listBasic(ctx.user.org_id),

  // Plattformsadministratör: alla organisationer med användare
  orgs: () => OrgModel.listWithMembers(),
  setSeats(ctx) {
    const org = OrgModel.findById(ctx.params.id);
    if (!org) throw new HttpError(404, 'Organisationen hittades inte.');
    const seats = Math.floor(Number(ctx.body.seats));
    if (!(seats >= 1 && seats <= 10000)) throw new HttpError(400, 'Ange antal användarplatser (1 eller fler).');
    const plan = ctx.body.plan;
    if (plan !== undefined && !PLANS[plan]) throw new HttpError(400, 'Okänt paket.');
    OrgModel.setPlan(org.id, plan ?? org.plan, seats);
    // Provperiod: "activate" = betalande kund (ingen spärr), "extend" = ytterligare provdagar från idag
    if (ctx.body.trial === 'activate') OrgModel.setTrial(org.id, null);
    else if (ctx.body.trial === 'extend') OrgModel.setTrial(org.id, new Date(Date.now() + TRIAL_DAYS * 86400e3).toISOString());
    AuditLogModel.record(ctx.user.id, 'org_plan', `${org.name}: ${plan ?? org.plan}, ${seats} platser`);
    return { ok: true };
  },
  reinstate(ctx) {
    const target = UserModel.findById(ctx.params.id);
    if (!target) throw new HttpError(404, 'Användaren hittades inte.');
    UserModel.reinstate(target.id);
    AuditLogModel.record(ctx.user.id, 'user_reinstate', target.email);
    return { ok: true };
  },
  destroy(ctx) {
    const target = UserModel.findById(ctx.params.id);
    if (!target) throw new HttpError(404, 'Användaren hittades inte.');
    if (target.id === ctx.user.id) throw new HttpError(400, 'Du kan inte ta bort dig själv här. Använd "Ta bort mitt konto".');
    UserModel.delete(target.id);
    AuditLogModel.record(ctx.user.id, 'user_delete', target.email);
    return { ok: true };
  },
};
