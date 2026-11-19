import { HttpError } from '../core/http-error.js';
import { one, run } from '../database/connection.js';
import { PLANS } from '../config/constants.js';
import { OrgModel } from '../models/org.model.js';

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Veckans måndag (svensk tid) som nyckel, t.ex. "2026-11-16"
export function weekKey(d = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const back = Math.max(0, DAYS.indexOf(p.weekday));
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) - back)).toISOString().slice(0, 10);
}

export const PlanService = {
  planOf(orgId) {
    const org = OrgModel.findById(orgId);
    return PLANS[org?.plan] || PLANS.start;
  },
  used: (orgId) => one('SELECT leads FROM org_weekly WHERE org_id=? AND week=?', orgId, weekKey())?.leads || 0,
  // Hur många företag organisationen får lägga i tavlan resten av veckan (null = obegränsat)
  left(orgId) {
    const limit = this.planOf(orgId).leadsPerWeek;
    return limit == null ? null : Math.max(0, limit - this.used(orgId));
  },
  usage(orgId) {
    const plan = this.planOf(orgId);
    return { plan: plan.id, label: plan.label, limit: plan.leadsPerWeek, used: this.used(orgId), phone: plan.phone };
  },
  // Kastar om n företag inte ryms i veckans kvot
  ensure(orgId, n = 1) {
    const left = this.left(orgId);
    if (left !== null && n > left) {
      const plan = this.planOf(orgId);
      throw new HttpError(429, `Ert paket ${plan.label} tillåter ${plan.leadsPerWeek} nya företag i tavlan per vecka och ${left === 0 ? 'den kvoten är använd' : `det finns bara ${left} kvar`}. Kvoten nollställs på måndag. Uppgradera paketet för mer.`);
    }
  },
  consume(orgId, n) {
    run('INSERT INTO org_weekly(org_id, week, leads) VALUES (?,?,?) ON CONFLICT(org_id, week) DO UPDATE SET leads = leads + excluded.leads', orgId, weekKey(), n);
  },
  // Ett lead som ångras inom 10 minuter (samma vecka) ger tillbaka sin plats i veckokvoten
  refund(orgId, createdAt) {
    const age = Date.now() - Date.parse(createdAt);
    if (!(age >= 0 && age < 10 * 60e3) || weekKey(new Date(createdAt)) !== weekKey()) return;
    run('UPDATE org_weekly SET leads = MAX(0, leads - 1) WHERE org_id=? AND week=?', orgId, weekKey());
  },
  requirePhone(user) {
    if (user.role !== 'admin' && !this.planOf(user.org_id).phone) throw new HttpError(403, 'Telefonlänk ingår i paketet Team. Uppgradera för att kunna ringa från webben.');
  },
};
