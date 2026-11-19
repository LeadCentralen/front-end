import { all, run, now } from '../database/connection.js';

export const AuditLogModel = {
  record(userId, action, detail = '') {
    run('INSERT INTO audit(user_id, action, detail, created_at) VALUES (?,?,?,?)', userId ?? null, action, String(detail).slice(0, 300), now());
  },
  forUser: (userId) => all('SELECT action, detail, created_at FROM audit WHERE user_id=? ORDER BY created_at', userId),
  detachUser: (userId) => run('UPDATE audit SET user_id=NULL WHERE user_id=?', userId),
  purgeOlderThan: (iso) => run('DELETE FROM audit WHERE created_at < ?', iso),
};
