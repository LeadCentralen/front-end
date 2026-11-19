import { state } from '../state.js';
import { toast } from '../utils/dom.js';
import { AuthModel } from '../models/auth.model.js';
import { AccountModel } from '../models/account.model.js';
import { AdminModel } from '../models/admin.model.js';
import { OrgModel } from '../models/org.model.js';
import { renderSettingsFrame, renderAccountTab, renderTeamTab, renderOrgsTab, renderImportTab, renderSuppressionTab } from '../views/settings.view.js';

export const SettingsController = {
  async index(root, tab) {
    const admin = state.user.role === 'admin';
    const manager = admin || state.user.role === 'owner';
    const tabs = [['konto', 'Mitt konto'], ...(manager ? [['team', 'Team']] : []), ...(admin ? [['organisationer', 'Organisationer'], ['import', 'Dataimport'], ['sparr', 'Spärrlista och begäranden']] : [])];
    tab = tabs.some(([id]) => id === tab) ? tab : 'konto';
    const box = renderSettingsFrame(root, { tabs, tab });
    const again = () => SettingsController.index(root, tab);
    await TABS[tab](box, again);
  },
};

const TABS = {
  konto: (box) => renderAccountTab(box, {
    user: state.user, exportUrl: AccountModel.exportUrl,
    onChangePassword: async (cur, next) => { await AuthModel.changePassword(cur, next); toast('Lösenordet är ändrat'); },
    onDelete: async (pw) => { await AccountModel.deleteAccount(pw); location.hash = '#/logga-in'; location.reload(); },
  }),

  async team(box, again) {
    renderTeamTab(box, {
      data: await OrgModel.show(), me: state.user,
      onUpdate: async (data) => { await OrgModel.update(data); toast('Sparat'); state.user.org_name = data.name; again(); },
      onCreate: async (data) => { await OrgModel.addMember(data); toast('Användare skapad'); again(); },
      onDelete: async (id) => { await OrgModel.removeMember(id); again(); },
      onReinstate: async (id) => { await OrgModel.reinstateMember(id); toast('Kontot är återaktiverat'); again(); },
      onPassword: async (id, pw) => { try { await OrgModel.resetPassword(id, pw); toast('Lösenordet är bytt'); } catch (e) { toast(e.message, 'error'); } },
    });
  },

  async organisationer(box, again) {
    renderOrgsTab(box, {
      orgs: await AdminModel.orgs(), me: state.user,
      plans: state.config.plans, onSeats: async (id, seats, plan, trial) => { try { await AdminModel.setSeats(id, Number(seats), plan, trial); toast('Användarplatser sparade'); again(); } catch (e) { toast(e.message, 'error'); } },
      onDelete: async (id) => { await AdminModel.deleteUser(id); again(); },
      onReinstate: async (id) => { await AdminModel.reinstateUser(id); toast('Kontot är återaktiverat'); again(); },
    });
  },

  async import(box, again) {
    renderImportTab(box, {
      stats: await AdminModel.stats(),
      onImport: async (file, encoding) => {
        const res = await AdminModel.importFile(file, encoding);
        toast('Importen är klar');
        state.config = await AuthModel.config();
        return res;
      },
      onDeleteDemo: async () => { await AdminModel.deleteDemo(); state.config = await AuthModel.config(); again(); },
    });
  },

  async sparr(box, again) {
    const { list, requests } = await AdminModel.suppression();
    renderSuppressionTab(box, {
      list, requests,
      onSuppress: async (orgnr, reason, requestId) => { await AdminModel.suppress(orgnr, reason, requestId); toast('Företaget är spärrat'); again(); },
      onRelease: async (orgnr) => { await AdminModel.release(orgnr); again(); },
      onHandled: async (id) => { await AdminModel.markRequestHandled(id); again(); },
    });
  },
};
