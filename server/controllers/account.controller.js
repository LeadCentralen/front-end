import { HttpError } from '../core/http-error.js';
import { sendDownload } from '../core/http.js';
import { clearSessionCookie } from '../core/cookies.js';
import { tx } from '../database/connection.js';
import { UserModel } from '../models/user.model.js';
import { LeadModel } from '../models/lead.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { OrgModel } from '../models/org.model.js';
import { PasswordService } from '../services/password.service.js';

// GDPR: den inloggades rätt till tillgång (export) och radering
export const AccountController = {
  exportMyData(ctx) {
    const u = UserModel.profile(ctx.user.id);
    const data = {
      exporterad: new Date().toISOString(),
      konto: u,
      leads_dar_jag_ar_ansvarig: LeadModel.ownedBy(u.id),
      mina_aktiviteter: ActivityModel.byUser(u.id),
      logg: AuditLogModel.forUser(u.id),
    };
    AuditLogModel.record(u.id, 'export_own_data');
    sendDownload(ctx.res, { body: JSON.stringify(data, null, 2), contentType: 'application/json; charset=utf-8', filename: 'mina-uppgifter.json' });
  },

  destroy(ctx) {
    const u = UserModel.findById(ctx.user.id);
    if (!PasswordService.verify(String(ctx.body.password || ''), u.pw_hash)) throw new HttpError(400, 'Lösenordet stämmer inte.');
    if (u.role === 'admin' && UserModel.countAdmins() <= 1) throw new HttpError(400, 'Du är den sista administratören. Utse en annan administratör först.');
    const lastInOrg = u.org_id && OrgModel.memberCount(u.org_id) <= 1;
    if (u.role === 'owner' && u.org_id && !lastInOrg) throw new HttpError(400, 'Du är kontoägare och organisationen har fler användare. Ta bort de andra användarna först, eller gör en kollega till kontoägare.');
    tx(() => {
      if (lastInOrg && u.role !== 'admin') OrgModel.delete(u.org_id); // sista användaren: organisationens leads raderas också
      AuditLogModel.record(null, 'account_deleted', `användar-id ${u.id}`);
      AuditLogModel.detachUser(u.id);
      UserModel.delete(u.id); // aktiviteter och leads behåller historiken men tappar kopplingen (ON DELETE SET NULL)
    });
    clearSessionCookie(ctx.res);
    return { ok: true };
  },
};
