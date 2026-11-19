import { ConfigController } from '../controllers/config.controller.js';
import { RemovalRequestController } from '../controllers/removal-request.controller.js';

// Öppna routes (ingen inloggning krävs)
export function registerPublicRoutes(r) {
  r.get('/api/config', ConfigController.show, { auth: false });
  r.post('/api/public/removal-request', RemovalRequestController.create, { auth: false });
}
