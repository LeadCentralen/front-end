import { request } from './http.js';

export const OrgModel = {
  show: () => request('GET', '/org'),
  update: (data) => request('PATCH', '/org', data),
  addMember: (data) => request('POST', '/org/members', data),
  removeMember: (id) => request('DELETE', '/org/members/' + id),
  reinstateMember: (id) => request('POST', `/org/members/${id}/reinstate`, {}),
  resetPassword: (id, password) => request('POST', `/org/members/${id}/password`, { password }),
};
