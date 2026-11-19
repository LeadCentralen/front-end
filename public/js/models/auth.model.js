import { request, qs } from './http.js';

export const AuthModel = {
  config: () => request('GET', '/config'),
  me: () => request('GET', '/auth/me', undefined, { quiet: true }),
  login: (email, password) => request('POST', '/auth/login', { email, password }, { quiet: true }),
  setup: (name, email, password) => request('POST', '/auth/setup', { name, email, password }, { quiet: true }),
  register: (data) => request('POST', '/auth/register', data, { quiet: true }),
  lookupOrg: (orgnr) => request('GET', '/auth/org-lookup' + qs({ orgnr }), undefined, { quiet: true }),
  logout: () => request('POST', '/auth/logout', {}, { quiet: true }),
  changePassword: (current, next) => request('POST', '/auth/password', { current, next }),
};
