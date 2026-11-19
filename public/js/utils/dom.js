// Små hjälpfunktioner. Allt som visas byggs med textContent (inga innerHTML) → skydd mot XSS.
export function el(tag, props, ...children) {
  const node = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'value') value = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in node && !['list', 'form'].includes(k)) node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  append(node, children);
  if (value !== undefined) node.value = value;
  return node;
}
export function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}
export function toast(msg, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = el('div', { id: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const t = el('div', { class: 'toast ' + (kind === 'error' ? 'error' : '') }, msg);
  box.append(t);
  setTimeout(() => t.remove(), kind === 'error' ? 6000 : 3000);
}
export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function option(value, label, selected) {
  return el('option', { value, selected: !!selected }, label);
}
