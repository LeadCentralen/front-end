import { state } from './state.js';
import { AuthController } from './controllers/auth.controller.js';
import { route } from './router.js';
import { watchIdle } from './utils/idle.js';

window.addEventListener('hashchange', route);
await AuthController.boot();
if (state.user && /^#\/(logga-in|skapa-konto)/.test(location.hash)) location.hash = '#/';
route();
watchIdle(() => AuthController.logout());
