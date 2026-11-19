import { HttpError } from '../core/http-error.js';

// Alla skrivande anrop måste skicka headern X-LC (kan inte sättas av en främmande webbplats utan CORS).
export function csrfGuard(req) {
  if (req.method !== 'GET' && req.headers['x-lc'] !== '1') throw new HttpError(403, 'Ogiltig begäran.');
}
