import { one, run } from '../database/connection.js';

export const SessionModel = {
  create: (tokenHash, userId, expiresAt) => run('INSERT INTO sessions(token_hash,user_id,expires_at,last_seen) VALUES (?,?,?,?)', tokenHash, userId, expiresAt, Date.now()),
  findUser: (tokenHash) => one(
    `SELECT u.id, u.email, u.name, u.role, u.org_id, o.name AS org_name, o.plan AS org_plan, o.trial_ends_at, u.suspended_at, s.expires_at, s.last_seen
       FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN orgs o ON o.id=u.org_id WHERE s.token_hash=?`, tokenHash),
  touch: (tokenHash, at) => run('UPDATE sessions SET last_seen=? WHERE token_hash=?', at, tokenHash),
  // Senaste aktivitet bland användarens sessioner (null om inga finns)
  lastActivity: (userId) => one('SELECT MAX(COALESCE(last_seen, 0)) t FROM sessions WHERE user_id=? AND expires_at > ?', userId, Date.now())?.t || null,
  delete: (tokenHash) => run('DELETE FROM sessions WHERE token_hash=?', tokenHash),
  deleteForUser: (userId) => run('DELETE FROM sessions WHERE user_id=?', userId),
  deleteExpired: () => run('DELETE FROM sessions WHERE expires_at < ?', Date.now()),
};
