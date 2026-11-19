import { AuditLogModel } from '../models/audit-log.model.js';
import { SessionModel } from '../models/session.model.js';

export const MaintenanceService = {
  // Gallring: säkerhetslogg äldre än 12 månader och utgångna sessioner
  purge() {
    AuditLogModel.purgeOlderThan(new Date(Date.now() - 365 * 86400e3).toISOString());
    SessionModel.deleteExpired();
  },
};
