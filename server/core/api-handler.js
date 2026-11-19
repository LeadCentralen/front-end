// Front controller för /api: CSRF-skydd → autentisering → behörighet → body → controller → JSON.
import { HttpError } from './http-error.js';
import { readJson, sendJson } from './http.js';
import { csrfGuard } from '../middleware/csrf.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { clientIp } from '../middleware/client-ip.middleware.js';

export function createApiHandler(router) {
  return async function handleApi(req, res, url) {
    try {
      const found = router.match(req.method, url.pathname);
      if (!found) throw new HttpError(404, 'Hittades inte.');
      const { route, params } = found;
      csrfGuard(req);
      const user = authenticate(req);
      authorize(user, route.opts);
      // Utgången provperiod: bara inloggning, konfiguration och kontouppgifter (GDPR) fungerar tills kunden aktiverats
      if (user?.locked && !/^\/api\/(auth|config|account)(\/|$)/.test(url.pathname)) throw new HttpError(402, 'Den kostnadsfria provperioden är slut. Kontakta oss för att aktivera ert paket. Era uppgifter finns kvar.');
      const ctx = { req, res, url, params, query: Object.fromEntries(url.searchParams), user, ip: clientIp(req), body: {} };
      if (route.opts.body !== false && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) ctx.body = await readJson(req);
      const result = await route.handler(ctx);
      if (!res.writableEnded) sendJson(res, 200, result === undefined ? { ok: true } : result);
    } catch (e) {
      if (res.writableEnded) return;
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
      console.error(e);
      sendJson(res, 500, { error: 'Något gick fel på servern.' });
    }
  };
}
