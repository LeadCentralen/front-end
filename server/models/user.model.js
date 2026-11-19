import { all, one, run, now } from '../database/connection.js';

export const UserModel = {
  count: () => one('SELECT COUNT(*) n FROM users').n,
  countAdmins: () => one("SELECT COUNT(*) n FROM users WHERE role='admin'").n,
  findById: (id) => one('SELECT * FROM users WHERE id=?', id),
  findByEmail: (email) => one('SELECT * FROM users WHERE email=?', email),
  exists: (id, orgId) => !!one(orgId ? 'SELECT 1 x FROM users WHERE id=? AND org_id=?' : 'SELECT 1 x FROM users WHERE id=?', ...(orgId ? [id, orgId] : [id])),
  create({ email, name, pwHash, role = 'user', orgId = null }) {
    const r = run('INSERT INTO users(email,name,pw_hash,role,created_at,org_id) VALUES (?,?,?,?,?,?)', email, name, pwHash, role, now(), orgId);
    return Number(r.lastInsertRowid);
  },
  listBasic: (orgId) => all('SELECT id, name FROM users WHERE org_id=? ORDER BY name', orgId),
  listAll: () => all('SELECT id, email, name, role, created_at, last_login_at, violations, suspended_at FROM users ORDER BY name'),
  updatePassword: (id, pwHash) => run('UPDATE users SET pw_hash=? WHERE id=?', pwHash, id),
  touchLogin: (id) => run('UPDATE users SET last_login_at=? WHERE id=?', now(), id),
  delete: (id) => run('DELETE FROM users WHERE id=?', id),
  // En varning (en enhet till samtidigt). Varningar äldre än 30 dagar glöms. Returnerar nya antalet.
  addViolation(id) {
    const u = one('SELECT violations, last_violation_at FROM users WHERE id=?', id);
    const fresh = u.last_violation_at && Date.now() - Date.parse(u.last_violation_at) < 30 * 86400e3;
    const n = (fresh ? u.violations : 0) + 1;
    run('UPDATE users SET violations=?, last_violation_at=? WHERE id=?', n, now(), id);
    return n;
  },
  suspend: (id) => run('UPDATE users SET suspended_at=? WHERE id=?', now(), id),
  reinstate: (id) => run('UPDATE users SET suspended_at=NULL, violations=0, last_violation_at=NULL WHERE id=?', id),
  profile: (id) => one('SELECT id, email, name, role, org_id, created_at, last_login_at FROM users WHERE id=?', id),
};
