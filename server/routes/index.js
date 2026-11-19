import { Router } from '../core/router.js';
import { registerPublicRoutes } from './public.routes.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerCompanyRoutes } from './company.routes.js';
import { registerLeadRoutes } from './lead.routes.js';
import { registerAccountRoutes } from './account.routes.js';
import { registerAdminRoutes } from './admin.routes.js';
import { registerPhoneRoutes } from './phone.routes.js';
import { registerStatsRoutes } from './stats.routes.js';
import { registerOrgRoutes } from './org.routes.js';

export function buildRouter() {
  const router = new Router();
  registerPublicRoutes(router);
  registerAuthRoutes(router);
  registerCompanyRoutes(router);
  registerLeadRoutes(router);
  registerAccountRoutes(router);
  registerAdminRoutes(router);
  registerPhoneRoutes(router);
  registerStatsRoutes(router);
  registerOrgRoutes(router);
  return router;
}
