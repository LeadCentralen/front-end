import { AccountController } from '../controllers/account.controller.js';

export function registerAccountRoutes(r) {
  r.get('/api/me/export', AccountController.exportMyData);
  r.delete('/api/me', AccountController.destroy);
}
