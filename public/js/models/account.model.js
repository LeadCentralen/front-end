import { request } from './http.js';

export const AccountModel = {
  exportUrl: '/api/me/export',
  deleteAccount: (password) => request('DELETE', '/me', { password }),
  // Öppen begäran om borttagning (Företagspolicy)
  requestRemoval: (data) => request('POST', '/public/removal-request', data, { quiet: true }),
};
