import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;

export const config = {
  root,
  publicDir: path.join(root, 'public'),
  port: Number(env.PORT || 3000),
  host: env.HOST || '127.0.0.1',
  dbPath: env.DB_PATH || path.join(root, 'data', 'leadcentralen.db'),
  production: env.NODE_ENV === 'production',
  trustProxy: env.TRUST_PROXY === '1',
  sessionDays: 7,
  // Inloggning: en enhet åt gången och automatisk utloggning vid inaktivitet
  idleMinutes: Number(env.SESSION_IDLE_MIN) > 0 ? Number(env.SESSION_IDLE_MIN) : 30,
  concurrentWindowMinutes: Number(env.CONCURRENT_WINDOW_MIN) > 0 ? Number(env.CONCURRENT_WINDOW_MIN) : 5,
  allowSignup: env.ALLOW_SIGNUP !== '0', // öppen registrering av nya organisationer
  maxWarnings: 2, // varning 1 och 2, tredje gången stängs kontot av
  policyUpdated: '2026-11-18',
  appName: 'Leadcentralen',
  // Personuppgiftsansvarig (visas i policysidorna)
  controller: {
    name: env.COMPANY_NAME || 'IT Hjälparna Nordic AB',
    orgnr: env.COMPANY_ORGNR || '',
    address: env.COMPANY_ADDRESS || '',
    email: env.COMPANY_EMAIL || '',
    phone: env.COMPANY_PHONE || '',
  },
};
