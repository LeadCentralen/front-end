import crypto from 'node:crypto';

export const PasswordService = {
  hash(pw) {
    const salt = crypto.randomBytes(16);
    return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
  },
  verify(pw, stored) {
    try {
      const [alg, s, h] = stored.split('$');
      if (alg !== 'scrypt') return false;
      return crypto.timingSafeEqual(crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64), Buffer.from(h, 'hex'));
    } catch {
      return false;
    }
  },
  // Returnerar felmeddelande eller null
  validate(pw) {
    if (typeof pw !== 'string' || pw.length < 10) return 'Lösenordet måste vara minst 10 tecken.';
    if (pw.length > 200) return 'Lösenordet är för långt.';
    return null;
  },
};
