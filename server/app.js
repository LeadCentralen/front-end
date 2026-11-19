import http from 'node:http';
import { buildRouter } from './routes/index.js';
import { createApiHandler } from './core/api-handler.js';
import { securityHeaders } from './middleware/security-headers.middleware.js';
import { serveStatic } from './middleware/static.middleware.js';

export function createApp() {
  const handleApi = createApiHandler(buildRouter());
  return http.createServer((req, res) => {
    securityHeaders(res);
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
    return serveStatic(req, res, url);
  });
}
