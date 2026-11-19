import { el, clear } from '../utils/dom.js';
import { LEGAL_LINKS } from '../content/legal.content.js';
import { state } from '../state.js';

// Ritar sidans ram (header, meny, footer) och returnerar <main>.
export function renderLayout(app, { user, route, onLogout }) {
  const link = (href, label, id) => el('a', { href, 'aria-current': route === id ? 'page' : null }, label);
  const nav = user && !user.locked && el('nav', { class: 'nav', 'aria-label': 'Huvudmeny' },
    link('#/', 'Sök företag', 'sok'), link('#/tavla', 'Leadtavla', 'tavla'), link('#/statistik', 'Statistik', 'statistik'), link('#/installningar', 'Inställningar', 'installningar'));
  const main = el('main', { id: 'main' });
  clear(app).append(el('div', { class: 'shell' },
    el('a', { class: 'sr-only', href: '#main', onclick: (e) => { e.preventDefault(); main.focus(); } }, 'Hoppa till innehållet'),
    el('header', { class: 'topbar' }, el('div', { class: 'topbar-inner' },
      el('a', { class: 'brand', href: '#/' }, el('img', { class: 'brand-logo', src: '/assets/img/logo.png', alt: '', width: 28, height: 28 }), 'Leadcentralen'),
      nav || el('div', { class: 'nav' }),
      !user && el('div', { class: 'user-menu' }, el('a', { class: 'btn small', href: '#/logga-in' }, 'Logga in'), el('a', { class: 'btn small primary', href: '#/skapa-konto' }, 'Prova gratis')),
      user && el('div', { class: 'user-menu' },
        el('span', { class: 'who' }, user.name, user.org_name && el('span', { class: 'org-name' }, ' · ' + user.org_name)),
        el('button', { class: 'btn small', onclick: onLogout }, 'Logga ut')))),
    user?.trial_ends_at && !user.locked && el('div', { class: 'trial-band' }, (() => {
      const days = Math.max(1, Math.ceil((Date.parse(user.trial_ends_at) - Date.now()) / 86400e3));
      const mail = state.config?.controller?.email;
      return [`Gratis provperiod: ${days} ${days === 1 ? 'dag' : 'dagar'} kvar. `, mail ? el('a', { href: 'mailto:' + mail }, 'Kontakta oss för att fortsätta') : 'Hör av dig för att fortsätta'];
    })()),
    main,
    el('footer', { class: 'footer' }, el('div', { class: 'footer-inner' },
      el('nav', { 'aria-label': 'Policys och villkor' }, LEGAL_LINKS.map(([id, label]) => el('a', { href: '#/' + id }, label))),
      el('div', null, `© ${new Date().getFullYear()} Leadcentralen · Utvecklat av `,
        el('a', { class: 'brand-link', href: 'https://www.ithjalparna.se', target: '_blank', rel: 'noopener' }, 'IT Hjälparna Nordic AB')),
      el('div', { class: 'small' }, 'Företagsuppgifter från SCB:s företagsregister')))));
  main.tabIndex = -1;
  return main;
}
