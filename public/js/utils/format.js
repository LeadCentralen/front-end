export const TYPE_LABELS = { note: 'Anteckning', call: 'Samtal', email: 'E-post', meeting: 'Möte', stage: 'Status' };

export function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(d)) return iso;
  const opts = withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleString('sv-SE', opts);
}
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function initials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
export function safeUrl(u) {
  if (!u) return null;
  const s = /^https?:\/\//i.test(u) ? u : 'https://' + u;
  try {
    const url = new URL(s);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
export const kr = (n) => (n == null ? '' : new Intl.NumberFormat('sv-SE').format(n) + ' kr');
export const nf = (n) => new Intl.NumberFormat('sv-SE').format(n);
