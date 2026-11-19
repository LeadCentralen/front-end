// Sidopanel (drawer): hanterar overlay, fokus och Esc. Innehållet ritas av en view.
import { el } from '../utils/dom.js';

let current = null;

export function closeDrawer() {
  if (!current) return;
  current.overlay.remove();
  current.panel.remove();
  document.removeEventListener('keydown', current.onKey);
  document.body.style.overflow = '';
  current.prev?.focus?.();
  const cb = current.onClose;
  current = null;
  cb?.();
}

export function openDrawer(onClose) {
  closeDrawer();
  const prev = document.activeElement;
  const overlay = el('div', { class: 'overlay', onclick: closeDrawer });
  const panel = el('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Företagsinformation' });
  const onKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
  document.addEventListener('keydown', onKey);
  document.body.append(overlay, panel);
  document.body.style.overflow = 'hidden';
  current = { overlay, panel, onKey, prev, onClose };
  return panel;
}
