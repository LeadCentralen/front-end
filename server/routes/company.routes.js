import { CompanyController } from '../controllers/company.controller.js';

export function registerCompanyRoutes(r) {
  r.get('/api/companies', CompanyController.index);
  r.get('/api/companies/:orgnr', CompanyController.show);
  r.get('/api/facets', CompanyController.facets);
}
