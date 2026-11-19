import { request } from './http.js';

export const PhoneModel = {
  status: () => request('GET', '/phone/status', undefined, { quiet: true }),
  pairCode: () => request('POST', '/phone/pair-code', {}),
  unpair: () => request('DELETE', '/phone', {}),
  dial: (name, number) => request('POST', '/phone/dial', { name, number }, { quiet: true }),
  call: (id) => request('GET', '/phone/call/' + encodeURIComponent(id), undefined, { quiet: true }),
};
