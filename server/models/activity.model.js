import { all, one, run, now } from '../database/connection.js';

export const ActivityModel = {
  create: (leadId, userId, type, text) => run('INSERT INTO activities(lead_id,user_id,type,text,created_at) VALUES (?,?,?,?,?)', leadId, userId, type, text || null, now()),
  createCall: (leadId, userId, text, outcome, seconds) => run('INSERT INTO activities(lead_id,user_id,type,text,created_at,outcome,seconds) VALUES (?,?,?,?,?,?,?)', leadId, userId, 'call', text || null, now(), outcome, seconds),
  forLead: (leadId) => all(
    `SELECT a.id, a.type, a.text, a.created_at, a.user_id, u.name AS user_name FROM activities a
     LEFT JOIN users u ON u.id=a.user_id WHERE a.lead_id=? ORDER BY a.created_at DESC, a.id DESC`, leadId),
  // Användarens senaste samtal över alla leads (telefonens samtalslogg)
  recentCalls: (userId, limit = 8) => all(
    `SELECT a.text, a.created_at, l.id AS lead_id, c.name AS company
       FROM activities a JOIN leads l ON l.id=a.lead_id JOIN companies c ON c.orgnr=l.orgnr
      WHERE a.type='call' AND a.user_id=? ORDER BY a.created_at DESC, a.id DESC LIMIT ?`, userId, limit),
  find: (id) => one('SELECT * FROM activities WHERE id=?', id),
  delete: (id) => run('DELETE FROM activities WHERE id=?', id),
  byUser: (userId) => all('SELECT lead_id, type, text, created_at FROM activities WHERE user_id=? ORDER BY created_at', userId),
};
