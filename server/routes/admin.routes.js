import { UserController } from '../controllers/user.controller.js';
import { DataController } from '../controllers/data.controller.js';
import { SuppressionController } from '../controllers/suppression.controller.js';

const admin = { admin: true };

export function registerAdminRoutes(r) {
  r.get('/api/admin/orgs', UserController.orgs, admin);
  r.patch('/api/admin/orgs/:id', UserController.setSeats, admin);
  r.post('/api/admin/users/:id/reinstate', UserController.reinstate, admin);
  r.delete('/api/admin/users/:id', UserController.destroy, admin);

  r.get('/api/admin/stats', DataController.stats, admin);
  r.post('/api/admin/import', DataController.importFile, { admin: true, body: false });
  r.delete('/api/admin/demo', DataController.deleteDemo, admin);

  r.get('/api/admin/suppression', SuppressionController.index, admin);
  r.post('/api/admin/suppression', SuppressionController.create, admin);
  r.delete('/api/admin/suppression/:orgnr', SuppressionController.destroy, admin);
  r.post('/api/admin/requests/:id/handled', SuppressionController.markRequestHandled, admin);
}
