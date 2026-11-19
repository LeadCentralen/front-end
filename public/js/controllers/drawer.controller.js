import { state } from '../state.js';
import { toast } from '../utils/dom.js';
import { CompanyModel } from '../models/company.model.js';
import { LeadModel } from '../models/lead.model.js';
import { openDrawer, closeDrawer } from '../components/drawer.component.js';
import { renderDrawer, renderDrawerError } from '../views/drawer.view.js';

export { closeDrawer };

// Öppnar företagspanelen. onChange körs när panelen stängs så att sidan bakom kan uppdateras.
export async function openCompany(orgnr, onChange) {
  const panel = openDrawer(onChange);
  let users = [];
  try { users = await LeadModel.users(); } catch { /* ignoreras */ }

  async function load(keepScroll) {
    const top = panel.scrollTop;
    try {
      const data = await CompanyModel.details(orgnr);
      const run = async (fn, msg, keep = true) => {
        try { await fn(); if (msg) toast(msg); await load(keep); } catch (e) { toast(e.message, 'error'); }
      };
      renderDrawer(panel, data, { stages: state.config.stages, users, me: state.user }, {
        onClose: closeDrawer,
        onAddLead: () => run(() => LeadModel.add(data.company.orgnr), 'Tillagd i leadtavlan', false),
        onSave: async (patch) => {
          try { await LeadModel.update(data.lead.id, patch); toast('Sparat'); if ('stage' in patch) load(true); }
          catch (e) { toast(e.message, 'error'); }
        },
        onRemoveLead: () => run(() => LeadModel.remove(data.lead.id), 'Borttaget från tavlan', false),
        onLog: (type, text) => run(() => LeadModel.logActivity(data.lead.id, type, text), 'Loggat'),
        onRemoveActivity: (id) => run(() => LeadModel.removeActivity(id)),
        // Samtalspanelen: lägger till leaden om den saknas, loggar samtalet och sätter ev. uppföljning.
        onCallDone: async (result) => {
          try {
            const id = data.lead ? data.lead.id : (await LeadModel.add(data.company.orgnr)).id;
            const r = await LeadModel.logCall(id, result);
            toast(r.moved ? `Samtalet är loggat. Flyttad till ${state.config.stages.find((x) => x.id === r.moved)?.label || r.moved}.` : 'Samtalet är loggat');
            await load(true);
          } catch (e) { toast(e.message, 'error'); }
        },
      });
      if (keepScroll) panel.scrollTop = top;
    } catch (e) {
      renderDrawerError(panel, e.message, closeDrawer);
    }
  }
  await load();
}
