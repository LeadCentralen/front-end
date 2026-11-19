// Strömmande CSV/TSV-läsare (stöd för citat, radbrytningar i citat och automatisk avgränsare).
function splitFields(line, delim) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
const quotes = (s) => { let n = 0; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 34) n++; return n; };

export async function* csvRecords(readable, encoding = 'utf-8') {
  const dec = new TextDecoder(encoding);
  const st = { carry: '', acc: null };
  let header = null, delim = ';', first = true;

  function* lines(text, final) {
    st.carry += text;
    const re = /\r\n|\n|\r/g;
    let last = 0, m;
    while ((m = re.exec(st.carry))) {
      if (m[0] === '\r' && m.index === st.carry.length - 1 && !final) break;
      const line = st.carry.slice(last, m.index);
      last = m.index + m[0].length;
      st.acc = st.acc === null ? line : st.acc + '\n' + line;
      if (quotes(st.acc) % 2 === 0) { yield st.acc; st.acc = null; }
    }
    st.carry = st.carry.slice(last);
    if (final) {
      if (st.carry) { st.acc = st.acc === null ? st.carry : st.acc + '\n' + st.carry; st.carry = ''; }
      if (st.acc !== null) { yield st.acc; st.acc = null; }
    }
  }
  function* handle(line) {
    if (first) { line = line.replace(/^﻿/, ''); first = false; }
    if (!line.trim()) return;
    if (!header) {
      const counts = [';', '\t', ',', '|'].map((d) => [d, line.split(d).length]);
      delim = counts.sort((a, b) => b[1] - a[1])[0][0];
      header = splitFields(line, delim).map((h) => h.trim());
      return;
    }
    const f = splitFields(line, delim);
    const obj = {};
    header.forEach((h, i) => { if (h) obj[h] = f[i]; });
    yield obj;
  }
  for await (const chunk of readable) {
    const text = typeof chunk === 'string' ? chunk : dec.decode(chunk, { stream: true });
    for (const l of lines(text, false)) yield* handle(l);
  }
  for (const l of lines(dec.decode(), true)) yield* handle(l);
}

