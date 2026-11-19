import { state } from '../state.js';
import { AuthModel } from '../models/auth.model.js';
import { renderLogin } from '../views/login.view.js';
import { renderRegister } from '../views/register.view.js';
import { renderLanding } from '../views/landing.view.js';

async function enter() {
  await AuthController.boot();
  if (location.hash === '#/') window.dispatchEvent(new Event('hashchange'));
  else location.hash = '#/';
}

export const AuthController = {
  // Hämtar config och inloggad användare. Anropas vid start och efter inloggning.
  async boot() {
    state.config = await AuthModel.config();
    state.user = null;
    if (state.config.loggedIn) {
      try { state.user = (await AuthModel.me()).user; } catch { state.user = null; }
    }
  },

  // Publik startsida (innan inloggning)
  landing(root) {
    renderLanding(root, { signup: state.config.signup !== false, plans: state.config.plans || [], contact: state.config.controller?.email || '' });
  },

  login(root) {
    const setup = state.config.needsSetup;
    let notice = '';
    try { notice = sessionStorage.getItem('lc_notice') || ''; sessionStorage.removeItem('lc_notice'); } catch { /* ignoreras */ }
    renderLogin(root, {
      setup, notice, signup: state.config.signup !== false,
      onSubmit: async ({ name, email, password }) => {
        await (setup ? AuthModel.setup(name, email, password) : AuthModel.login(email, password));
        await enter();
      },
    });
  },

  register(root, plan) {
    renderRegister(root, {
      plan, plans: (state.config.plans || []).filter((p) => p.id !== 'enterprise'),
      onLookup: (orgnr) => AuthModel.lookupOrg(orgnr),
      onSubmit: async (data) => {
        await AuthModel.register(data);
        await enter();
      },
    });
  },

  async logout() {
    // Ett meddelande (t.ex. utloggad för inaktivitet) visas på inloggningssidan, annars går man till startsidan
    let hasNotice = false;
    try { hasNotice = !!sessionStorage.getItem('lc_notice'); } catch { /* ignoreras */ }
    try { await AuthModel.logout(); } catch { /* ignoreras */ }
    state.user = null;
    location.hash = hasNotice ? '#/logga-in' : '#/';
    location.reload();
  },
};
