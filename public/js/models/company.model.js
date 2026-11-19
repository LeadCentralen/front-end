import { request, qs } from './http.js';

export const CompanyModel = {
  search: (filters) => request('GET', '/companies' + qs({ ...filters, pageSize: 25 })),
  facets: () => request('GET', '/facets'),
  details: (orgnr) => request('GET', '/companies/' + encodeURIComponent(orgnr)),
};
