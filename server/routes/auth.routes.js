import { AuthController } from '../controllers/auth.controller.js';

export function registerAuthRoutes(r) {
  r.post('/api/auth/setup', AuthController.setup, { auth: false });
  r.post('/api/auth/register', AuthController.register, { auth: false });
  r.get('/api/auth/org-lookup', AuthController.lookupOrg, { auth: false });
  r.post('/api/auth/login', AuthController.login, { auth: false });
  r.post('/api/auth/logout', AuthController.logout, { auth: false });
  r.get('/api/auth/me', AuthController.me);
  r.post('/api/auth/password', AuthController.changePassword);
}
