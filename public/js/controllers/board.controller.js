import { state } from '../state.js';
import { toast, el } from '../utils/dom.js';
import { LeadModel } from '../models/lead.model.js';
import { renderBoardPage } from '../views/board.view.js';
import { openCompany } from './drawer.controller.js';

let mine = false;
let query = '';
let group = '';

export const BoardController = {
  async index(root) {
    const phoneAllowed = state.user.features?.phone !== false;
    let leads = [];
    let calls = [];
    const draw = () => {
      const q = query.trim().toLowerCase();
      const shown = leads.filter((l) => (!mine || l.owner_id === state.user.id) && (!group || l.group_name === group) && (!q || l.name.toLowerCase().includes(q) || (l.city || '').toLowerCase().includes(q)));
      view.drawBoard(shown, state.config.stages, {
        onOpen: (orgnr) => openCompany(orgnr, load),
        onCall: !phoneAllowed ? null : (lead) => {
          if (view.callActive() && !confirm('Du har ett samtal som inte är loggat. Byta ändå?')) return;
          view.showPhone(lead, calls, {
            onCancel: () => view.showPhone(null, calls),
            onDone: async (result) => {
              try {
                const r = await LeadModel.logCall(lead.id, result);
                toast(r.moved ? `Samtalet är loggat. Flyttad till ${state.config.stages.find((x) => x.id === r.moved)?.label || r.moved}.` : 'Samtalet är loggat');
              } catch (e) { toast(e.message, 'error'); }
              await load();
              view.showPhone(null, calls);
            },
          });
        },
        onMove: async (id, stage, beforeId) => {
          try { await LeadModel.update(id, beforeId ? { stage, beforeId } : { stage }); } catch (e) { toast(e.message, 'error'); }
          load();
        },
      });
    };
    async function load() {
      try { leads = await LeadModel.board(); } catch (e) { toast(e.message, 'error'); return; }
      try { calls = await LeadModel.recentCalls(); } catch { calls = []; }
      const groups = [...new Set(leads.map((l) => l.group_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'));
      if (group && !groups.includes(group)) group = '';
      view.setGroups(groups, group);
      draw();
      if (!view.callActive()) view.showPhone(null, calls);
    }
    const view = renderBoardPage(root, {
      mine, query,
      onMine: (v) => { mine = v; draw(); },
      onQuery: (v) => { query = v; draw(); },
      onGroup: (v) => { group = v; draw(); },
      phoneAllowed,
      upgradeNote: el('div', { class: 'banner spaced-bottom' }, 'Telefonlänk, där du ringer från webben med din egen mobil, ingår i paketet Team. ', el('a', { href: '#/installningar/team' }, 'Se ditt paket')),
    });
    await load();
  },
};
