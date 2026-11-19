import { config } from '../config/index.js';
import { HttpError } from '../core/http-error.js';
import { getSessionToken, setSessionCookie, clearSessionCookie } from '../core/cookies.js';
import { rateLimit } from '../middleware/rate-limit.middleware.js';
import { UserModel } from '../models/user.model.js';
import { SessionModel } from '../models/session.model.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { PasswordService } from '../services/password.service.js';
import { SessionService } from '../services/session.service.js';
import { OrgModel } from '../models/org.model.js';
import { CompanyModel } from '../models/company.model.js';
import { normalizeOrgnr } from '../services/org.service.js';
import { tx } from '../database/connection.js';
import { PLANS, TRIAL_DAYS } from '../config/constants.js';

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;

function startSession(res, userId) {
  const { token, expires } = SessionService.start(userId);
  setSessionCookie(res, token, expires);
}

// En användare får bara vara inloggad på en enhet. Loggar någon in medan kontot var aktivt på en annan enhet nyligen
// räknas det som en varning: alla enheter loggas ut. Efter två varningar stängs kontot av vid nästa överträdelse.
// En gammal, inaktiv session ersätts tyst. Samma webbläsare (giltig cookie för samma användare) räknas som samma enhet.
function enforceSingleDevice(ctx, user) {
  const last = SessionModel.lastActivity(user.id);
  if (!last) return;
  const sameDevice = SessionService.userFromToken(getSessionToken(ctx.req))?.id === user.id;
  const active = Date.now() - last < config.concurrentWindowMinutes * 60e3;
  SessionModel.deleteForUser(user.id);
  if (sameDevice || !active) return;
  const n = UserModel.addViolation(user.id);
  AuditLogModel.record(user.id, 'multi_device', `överträdelse ${n}`);
  if (n > config.maxWarnings) {
    UserModel.suspend(user.id);
    AuditLogModel.record(user.id, 'suspended', 'flera enheter samtidigt');
    throw new HttpError(403, 'Kontot har stängts av eftersom det använts på flera enheter samtidigt, vilket strider mot användarvillkoren. Ingen återbetalning lämnas.');
  }
  throw new HttpError(403, `Varning ${n} av ${config.maxWarnings}: kontot var inloggat på en annan enhet samtidigt. Ett konto får bara användas på en enhet åt gången. Du har loggats ut överallt. Logga in igen från en enhet. Vid nästa överträdelse stängs kontot av utan återbetalning.`);
}

export const AuthController = {
  // Första installationen: skapar administratören. Går bara när inga användare finns.
  setup(ctx) {
    if (UserModel.count() > 0) throw new HttpError(403, 'Installationen är redan gjord.');
    const { name, email, password } = ctx.body;
    const e = text(email, 120).toLowerCase();
    if (!text(name, 80) || !emailOk(e)) throw new HttpError(400, 'Ange namn och en giltig e-postadress.');
    const bad = PasswordService.validate(password);
    if (bad) throw new HttpError(400, bad);
    const orgId = OrgModel.create({ orgnr: null, name: config.controller.name || 'Administration', seats: 1000, plan: 'enterprise' });
    const id = UserModel.create({ email: e, name: text(name, 80), pwHash: PasswordService.hash(password), role: 'admin', orgId });
    AuditLogModel.record(id, 'setup', 'Första administratören skapad');
    startSession(ctx.res, id);
    return { ok: true };
  },

  // Öppen registrering: skapar en organisation och dess första användare (kontoägaren).
  register(ctx) {
    if (!config.allowSignup) throw new HttpError(403, 'Nya konton skapas inte just nu. Kontakta oss.');
    if (UserModel.count() === 0) throw new HttpError(403, 'Installationen är inte klar.');
    rateLimit('register:' + ctx.ip, 10, 60 * 60e3);
    const b = ctx.body;
    const plan = b.plan === 'team' ? 'team' : 'start'; // Enterprise bokas via möte och läggs upp av oss
    const orgnr = normalizeOrgnr(b.orgnr);
    const orgName = text(b.orgName, 120);
    const name = text(b.name, 80);
    const email = text(b.email, 120).toLowerCase();
    if (!orgName) throw new HttpError(400, 'Ange företagets namn.');
    if (!name) throw new HttpError(400, 'Ange ditt namn.');
    if (!emailOk(email)) throw new HttpError(400, 'Ange en giltig e-postadress.');
    if (b.accept !== true) throw new HttpError(400, 'Du måste godkänna användarvillkoren och integritetspolicyn.');
    const bad = PasswordService.validate(b.password);
    if (bad) throw new HttpError(400, bad);
    if (OrgModel.findByOrgnr(orgnr)) throw new HttpError(409, 'Det finns redan ett konto för det organisationsnumret. Be er kontoägare lägga till dig som användare.');
    if (UserModel.findByEmail(email)) throw new HttpError(409, 'E-postadressen används redan. Logga in i stället.');
    const id = tx(() => {
      const orgId = OrgModel.create({ orgnr, name: orgName, email, phone: text(b.phone, 40), seats: PLANS[plan].seats, plan, trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400e3).toISOString() });
      return UserModel.create({ email, name, pwHash: PasswordService.hash(b.password), role: 'owner', orgId });
    });
    AuditLogModel.record(id, 'register', orgnr);
    startSession(ctx.res, id);
    return { ok: true };
  },

  // Förifyller företagsnamn från registret när man skriver in organisationsnumret (bara juridiska personer)
  lookupOrg(ctx) {
    rateLimit('orglookup:' + ctx.ip, 30, 10 * 60e3);
    const orgnr = normalizeOrgnr(ctx.query.orgnr);
    return { orgnr, name: CompanyModel.publicName(orgnr) };
  },

  login(ctx) {
    rateLimit('login:' + ctx.ip, 10, 15 * 60e3);
    const user = UserModel.findByEmail(text(ctx.body.email, 120).toLowerCase());
    if (!user || !PasswordService.verify(String(ctx.body.password || ''), user.pw_hash)) throw new HttpError(401, 'Fel e-postadress eller lösenord.');
    if (user.suspended_at) {
      AuditLogModel.record(user.id, 'login_blocked', 'avstängt konto');
      throw new HttpError(403, 'Kontot är avstängt eftersom det har använts på flera enheter samtidigt, vilket strider mot användarvillkoren. Ingen återbetalning lämnas. Kontakta oss om du anser att det är fel.');
    }
    if (user.role !== 'admin') enforceSingleDevice(ctx, user);
    startSession(ctx.res, user.id);
    AuditLogModel.record(user.id, 'login');
    return { ok: true };
  },

  logout(ctx) {
    SessionService.end(getSessionToken(ctx.req));
    clearSessionCookie(ctx.res);
    return { ok: true };
  },

  me: ({ user }) => ({ user }),

  changePassword(ctx) {
    const user = UserModel.findById(ctx.user.id);
    if (!PasswordService.verify(String(ctx.body.current || ''), user.pw_hash)) throw new HttpError(400, 'Nuvarande lösenord stämmer inte.');
    const bad = PasswordService.validate(ctx.body.next);
    if (bad) throw new HttpError(400, bad);
    UserModel.updatePassword(user.id, PasswordService.hash(ctx.body.next));
    SessionModel.deleteForUser(user.id); // loggar ut alla andra enheter
    startSession(ctx.res, user.id);
    AuditLogModel.record(user.id, 'password_change');
    return { ok: true };
  },
};
