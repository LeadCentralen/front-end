import { request, upload } from './http.js';

export const AdminModel = {
  orgs: () => request('GET', '/admin/orgs'),
  setSeats: (id, seats, plan, trial) => request('PATCH', '/admin/orgs/' + id, { seats, plan, trial }),
  reinstateUser: (id) => request('POST', '/admin/users/' + id + '/reinstate', {}),
  deleteUser: (id) => request('DELETE', '/admin/users/' + id),

  stats: () => request('GET', '/admin/stats'),
  importFile: (file, encoding) => upload(`/admin/import?format=${/\.(json|ndjson|jsonl)$/i.test(file.name) ? 'json' : 'csv'}&encoding=${encoding}`, file),
  deleteDemo: () => request('DELETE', '/admin/demo'),

  suppression: () => request('GET', '/admin/suppression'),
  suppress: (orgnr, reason, requestId) => request('POST', '/admin/suppression', { orgnr, reason, requestId }),
  release: (orgnr) => request('DELETE', '/admin/suppression/' + orgnr),
  markRequestHandled: (id) => request('POST', `/admin/requests/${id}/handled`, {}),
};
