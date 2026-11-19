import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { SessionModel } from '../models/session.model.js';
import { UserModel } from '../models/user.model.js';
import { PLANS } from '../config/constants.js';

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

export const SessionService = {
  // Token lagras aldrig i klartext, bara dess hash.
  start(userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expires = Date.now() + config.sessionDays * 86400e3;
    SessionModel.create(sha(token), userId, expires);
    UserModel.touchLogin(userId);
    return { token, expires };
  },
  end: (token) => token && SessionModel.delete(sha(token)),
  userFromToken(token) {
    if (!token) return null;
    const hash = sha(token);
    const row = SessionModel.findUser(hash);
    if (!row || row.expires_at < Date.now()) return null;
    if (row.suspended_at) { SessionModel.delete(hash); return null; }
    // Inaktiv för länge -> utloggad av säkerhetsskäl
    const last = row.last_seen || 0;
    if (Date.now() - last > config.idleMinutes * 60e3) { SessionModel.delete(hash); return null; }
    if (Date.now() - last > 30e3) SessionModel.touch(hash, Date.now());
    return { id: row.id, email: row.email, name: row.name, role: row.role, org_id: row.org_id, org_name: row.org_name, plan: row.org_plan || 'start', trial_ends_at: row.trial_ends_at || null,
      locked: row.role !== 'admin' && !!row.trial_ends_at && Date.parse(row.trial_ends_at) < Date.now(), features: { phone: row.role === 'admin' || (PLANS[row.org_plan] || PLANS.start).phone } };
  },
};
