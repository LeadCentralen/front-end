import { all, one, run, now } from '../database/connection.js';

export const OrgModel = {
  findById: (id) => one('SELECT * FROM orgs WHERE id=?', id),
  findByOrgnr: (orgnr) => one('SELECT * FROM orgs WHERE orgnr=?', orgnr),
  create({ orgnr, name, email, phone, seats, plan = 'start', trialEndsAt = null }) {
    const r = run('INSERT INTO orgs(orgnr,name,contact_email,phone,seats,plan,trial_ends_at,created_at) VALUES (?,?,?,?,?,?,?,?)', orgnr ?? null, name, email ?? null, phone ?? null, seats, plan, trialEndsAt, now());
    return Number(r.lastInsertRowid);
  },
  update: (id, { name, email, phone }) => run('UPDATE orgs SET name=?, contact_email=?, phone=? WHERE id=?', name, email || null, phone || null, id),
  setTrial: (id, iso) => run('UPDATE orgs SET trial_ends_at=? WHERE id=?', iso, id),
  setSeats: (id, seats) => run('UPDATE orgs SET seats=? WHERE id=?', seats, id),
  setPlan: (id, plan, seats) => run('UPDATE orgs SET plan=?, seats=? WHERE id=?', plan, seats, id),
  delete: (id) => run('DELETE FROM orgs WHERE id=?', id),
  memberCount: (id) => one('SELECT COUNT(*) n FROM users WHERE org_id=?', id).n,
  members: (id) => all(
    'SELECT id, email, name, role, created_at, last_login_at, violations, suspended_at FROM users WHERE org_id=? ORDER BY CASE role WHEN \'user\' THEN 1 ELSE 0 END, name', id),
  // Alla organisationer med medlemmar (för plattformsadministratören)
  listWithMembers() {
    const orgs = all('SELECT o.*, (SELECT COUNT(*) FROM leads l WHERE l.org_id=o.id) AS leads FROM orgs o ORDER BY o.created_at DESC');
    return orgs.map((o) => ({ ...o, members: this.members(o.id) }));
  },
};
