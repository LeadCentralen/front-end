import { config } from '../config/index.js';

export function clientIp(req) {
  if (config.trustProxy) {
    const f = req.headers['x-forwarded-for'];
    if (f) return String(f).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}
