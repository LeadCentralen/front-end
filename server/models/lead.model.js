import { all, one, run, now } from '../database/connection.js';

const UPDATABLE = ['stage', 'owner_id', 'value', 'next_step', 'next_date', 'position'];

export const LeadModel = {
  findById: (id, orgId) => one('SELECT * FROM leads WHERE id=? AND org_id=?', id, orgId),
  findByOrgnr: (orgnr, orgId) => one('SELECT * FROM leads WHERE orgnr=? AND org_id=?', orgnr, orgId),
  count: () => one('SELECT COUNT(*) n FROM leads').n,

  board: (orgId) => all(
    `SELECT l.group_name, l.id, CASE WHEN c.legal_form LIKE 'Enskild%' THEN 'id' || c.rowid ELSE l.orgnr END AS orgnr, l.stage, l.owner_id, l.value, l.next_step, l.next_date, l.position, l.updated_at,
            c.name, c.city, c.phone, c.email, c.legal_form, u.name AS owner_name,
            (SELECT MAX(created_at) FROM activities a WHERE a.lead_id=l.id AND a.type<>'stage') AS last_contact
     FROM leads l JOIN companies c ON c.orgnr=l.orgnr AND c.suppressed=0
     LEFT JOIN users u ON u.id=l.owner_id WHERE l.org_id=? ORDER BY l.position, l.id`, orgId),

  // Position för ett kort som läggs sist i en kolumn
  nextPosition: (stage, orgId) => one('SELECT COALESCE(MAX(position),0)+1 p FROM leads WHERE stage=? AND org_id=?', stage, orgId).p,

  // Position för ett kort som släpps framför kortet beforeId (eller sist om beforeId saknas)
  positionBefore(stage, movingId, beforeId, orgId) {
    const cards = all('SELECT id, position FROM leads WHERE stage=? AND id<>? AND org_id=? ORDER BY position, id', stage, movingId, orgId);
    const idx = beforeId ? cards.findIndex((c) => c.id === Number(beforeId)) : -1;
    if (idx === -1) return (cards.length ? cards[cards.length - 1].position : 0) + 1;
    if (idx === 0) return cards[0].position - 1;
    return (cards[idx - 1].position + cards[idx].position) / 2;
  },

  create({ orgId, orgnr, stage, ownerId, position, group = null }) {
    const ts = now();
    const r = run('INSERT INTO leads(org_id,orgnr,stage,owner_id,position,created_at,updated_at,group_name) VALUES (?,?,?,?,?,?,?,?)', orgId, orgnr, stage, ownerId, position, ts, ts, group);
    return Number(r.lastInsertRowid);
  },
  update(id, fields) {
    const keys = Object.keys(fields).filter((k) => UPDATABLE.includes(k));
    if (!keys.length) return;
    run(`UPDATE leads SET ${keys.map((k) => `${k}=?`).join(', ')}, updated_at=? WHERE id=?`, ...keys.map((k) => fields[k]), now(), id);
  },
  touch: (id) => run('UPDATE leads SET updated_at=? WHERE id=?', now(), id),
  delete: (id, orgId) => run('DELETE FROM leads WHERE id=? AND org_id=?', id, orgId),
  deleteByOrgnr: (orgnr) => run('DELETE FROM leads WHERE orgnr=?', orgnr),
  deleteForDemoCompanies: () => run("DELETE FROM leads WHERE orgnr IN (SELECT orgnr FROM companies WHERE source='demo')"),
  ownedBy: (userId) => all(`SELECT CASE WHEN c.legal_form LIKE 'Enskild%' THEN c.name ELSE l.orgnr END AS orgnr, l.stage, l.value, l.next_step, l.next_date, l.created_at
        FROM leads l LEFT JOIN companies c ON c.orgnr=l.orgnr WHERE l.owner_id=?`, userId),
};
