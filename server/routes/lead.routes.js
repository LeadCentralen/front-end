import { LeadController } from '../controllers/lead.controller.js';
import { UserController } from '../controllers/user.controller.js';

export function registerLeadRoutes(r) {
  r.get('/api/leads', LeadController.index);
  r.post('/api/leads', LeadController.create);
  r.patch('/api/leads/:id', LeadController.update);
  r.delete('/api/leads/:id', LeadController.destroy);
  r.post('/api/leads/bulk/preview', LeadController.bulkPreview);
  r.post('/api/leads/bulk', LeadController.bulkAdd);
  r.post('/api/leads/:id/call', LeadController.logCall);
  r.post('/api/leads/:id/activities', LeadController.addActivity);
  r.delete('/api/activities/:id', LeadController.destroyActivity);
  r.get('/api/calls/recent', LeadController.recentCalls);
  r.get('/api/users', UserController.index); // ansvarig-väljaren
}
