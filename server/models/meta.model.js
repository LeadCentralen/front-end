import { one, run } from '../database/connection.js';

export const MetaModel = {
  get: (key) => one('SELECT value FROM meta WHERE key=?', key)?.value ?? null,
  set: (key, value) => run('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, String(value)),
};
