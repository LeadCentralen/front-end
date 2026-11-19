// Front controller: läser #-adressen, väljer controller och ritar sidans ram.
import { state } from './state.js';
import { el, clear } from './utils/dom.js';
import { renderLayout } from './views/layout.view.js';
import { isLegal } from './content/legal.content.js';
import { closeDrawer } from './controllers/drawer.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { SearchController } from './controllers/search.controller.js';
import { BoardController } from './controllers/board.controller.js';
import { StatsController } from './controllers/stats.controller.js';
import { SettingsController } from './controllers/settings.controller.js';
import { LegalController } from './controllers/legal.controller.js';

const app = document.getElementById('app');

export async function route() {
  closeDrawer();
  const [, first = '', second = ''] = location.hash.replace(/^#/, '').split('/');
  const layout = (id) => renderLayout(app, { user: state.user, route: id, onLogout: AuthController.logout });

  if (isLegal(first)) { LegalController.show(layout(first), first); window.scrollTo(0, 0); return; }
  if (!state.user) {
    // Inte inloggad: startsida, inloggning eller registrering. Första installationen går direkt till skapa-admin.
    if (state.config.needsSetup || first === 'logga-in') AuthController.login(layout('login'));
    else if (first === 'skapa-konto' && state.config.signup !== false) AuthController.register(layout('register'), second);
    else {
      const main = layout('landing');
      main.classList.add('landing');
      AuthController.landing(main);
    }
    window.scrollTo(0, 0);
    return;
  }

  if (state.user.locked) {
    const mail = state.config.controller?.email;
    const main = layout('locked');
    main.append(el('div', { class: 'auth' }, el('div', { class: 'card' },
      el('h1', null, 'Provperioden är slut'),
      el('p', null, 'Den kostnadsfria provperioden för ', el('strong', null, state.user.org_name || 'ert företag'), ' är slut. Era leads och uppgifter finns kvar och blir tillgängliga igen när ert paket är aktiverat.'),
      mail ? el('a', { class: 'btn primary big', href: 'mailto:' + mail + '?subject=' + encodeURIComponent('Aktivera paket') }, 'Kontakta oss') : el('a', { class: 'btn primary big', href: 'https://www.ithjalparna.se', target: '_blank', rel: 'noopener' }, 'Kontakta oss'))));
    return;
  }
  const name = ['logga-in', 'skapa-konto'].includes(first) ? '' : first;
  const main = layout(name === '' ? 'sok' : name);
  try {
    if (name === '') await SearchController.index(main);
    else if (name === 'tavla') await BoardController.index(main);
    else if (name === 'statistik') await StatsController.index(main);
    else if (name === 'installningar') await SettingsController.index(main, second);
    else location.hash = '#/';
  } catch (e) {
    clear(main).append(el('p', { class: 'error' }, e.message));
  }
}
