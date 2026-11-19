import { PhoneController } from '../controllers/phone.controller.js';

export function registerPhoneRoutes(r) {
  r.post('/api/phone/pair-code', PhoneController.pairCode);
  r.get('/api/phone/status', PhoneController.status);
  r.delete('/api/phone', PhoneController.unpair);
  r.post('/api/phone/dial', PhoneController.dial);
  r.get('/api/phone/call/:id', PhoneController.call);
  // Telefonen (egen nyckel, ingen inloggning)
  r.post('/api/phone/pair', PhoneController.pair, { auth: false });
  r.get('/api/phone/poll', PhoneController.poll, { auth: false });
  r.post('/api/phone/report', PhoneController.report, { auth: false });
}
