import { HttpError } from '../core/http-error.js';
import { getSessionToken } from '../core/cookies.js';
import { SessionService } from '../services/session.service.js';

export const authenticate = (req) => SessionService.userFromToken(getSessionToken(req));

// opts.auth === false → öppen route. opts.admin → kräver administratör.
export function authorize(user, opts = {}) {
  if (opts.auth !== false && !user) throw new HttpError(401, 'Du är inte inloggad.');
  if (opts.admin && user.role !== 'admin') throw new HttpError(403, 'Kräver administratör.');
}
