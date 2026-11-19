import { all, run, now } from '../database/connection.js';

export const RemovalRequestModel = {
  create: ({ orgnr, name, email, message }) => run('INSERT INTO removal_requests(orgnr,name,email,message,created_at) VALUES (?,?,?,?,?)', orgnr, name, email, message, now()),
  list: () => all('SELECT * FROM removal_requests ORDER BY handled, created_at DESC LIMIT 200'),
  markHandled: (id) => run('UPDATE removal_requests SET handled=1 WHERE id=?', id),
};
