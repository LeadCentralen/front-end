import { HttpError } from '../core/http-error.js';

const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const t = Date.now();
  const recent = (buckets.get(key) || []).filter((x) => t - x < windowMs);
  if (recent.length >= max) throw new HttpError(429, 'För många försök. Vänta en stund och försök igen.');
  recent.push(t);
  buckets.set(key, recent);
  if (buckets.size > 5000) buckets.clear();
}
