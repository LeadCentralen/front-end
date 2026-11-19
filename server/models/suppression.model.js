import { all, one, run, now } from '../database/connection.js';

export const SuppressionModel = {
  exists: (orgnr) => !!one('SELECT 1 x FROM suppression WHERE orgnr=?', orgnr),
  add: (orgnr, reason) => run('INSERT INTO suppression(orgnr,reason,created_at) VALUES (?,?,?) ON CONFLICT(orgnr) DO UPDATE SET reason=excluded.reason', orgnr, reason || null, now()),
  remove: (orgnr) => run('DELETE FROM suppression WHERE orgnr=?', orgnr),
  list: () => all('SELECT orgnr, reason, created_at FROM suppression ORDER BY created_at DESC LIMIT 500'),
  count: () => one('SELECT COUNT(*) n FROM suppression').n,
};
