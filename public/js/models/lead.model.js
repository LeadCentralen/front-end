import { request } from './http.js';

export const LeadModel = {
  board: () => request('GET', '/leads').then((d) => d.leads),
  add: (orgnr, stage) => request('POST', '/leads', { orgnr, stage }),
  update: (id, patch) => request('PATCH', '/leads/' + id, patch),
  remove: (id) => request('DELETE', '/leads/' + id),
  logActivity: (id, type, text) => request('POST', `/leads/${id}/activities`, { type, text }),
  removeActivity: (id) => request('DELETE', '/activities/' + id),
  logCall: (id, result) => request('POST', `/leads/${id}/call`, result),
  bulkPreview: (filters) => request('POST', '/leads/bulk/preview', { filters }),
  bulkAdd: (filters, group, limit) => request('POST', '/leads/bulk', { filters, group, limit }),
  recentCalls: () => request('GET', '/calls/recent').then((d) => d.calls),
  users: () => request('GET', '/users'),
};
