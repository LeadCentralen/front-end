import { OrgController } from '../controllers/org.controller.js';

export function registerOrgRoutes(r) {
  r.get('/api/org', OrgController.show);
  r.patch('/api/org', OrgController.update);
  r.post('/api/org/members', OrgController.addMember);
  r.post('/api/org/members/:id/reinstate', OrgController.reinstateMember);
  r.post('/api/org/members/:id/password', OrgController.resetPassword);
  r.delete('/api/org/members/:id', OrgController.removeMember);
}
