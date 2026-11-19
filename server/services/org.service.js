import { HttpError } from '../core/http-error.js';

// Kontrollerar ett organisationsnummer: 10 siffror, giltig kontrollsiffra (Luhn) och en juridisk person.
// Tredje siffran i ett personnummer är 0 eller 1 (månad), i ett organisationsnummer 2 eller högre.
export function normalizeOrgnr(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  const ten = d.length === 12 && /^(16|18|19|20)/.test(d) ? d.slice(2) : d;
  if (ten.length !== 10) throw new HttpError(400, 'Organisationsnumret ska ha 10 siffror, till exempel 556677-8899.');
  if (Number(ten[2]) < 2) throw new HttpError(400, 'Det ser ut som ett personnummer. Skapa kontot med ett aktiebolags eller en förenings organisationsnummer, eller kontakta oss om du har enskild firma.');
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let n = Number(ten[i]) * (i % 2 === 0 ? 2 : 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  if (sum % 10 !== 0) throw new HttpError(400, 'Organisationsnumret verkar vara felskrivet. Kontrollera siffrorna.');
  return `${ten.slice(0, 6)}-${ten.slice(6)}`;
}
