import { state } from '../state.js';
import { debounce, toast } from '../utils/dom.js';
import { CompanyModel } from '../models/company.model.js';
import { LeadModel } from '../models/lead.model.js';
import { renderSearch } from '../views/search.view.js';
import { openCompany } from './drawer.controller.js';
import { openBulkAdd } from '../views/bulk-add.view.js';

const DEFAULT = { q: '', county: '', municipality: '', section: '', sni: '', size: '', revenue: '', form: '', hasPhone: false, hasEmail: false, status: 'Aktiv', lead: '', sort: 'namn', page: 1 };
let filters = { ...DEFAULT };
let facets = null;

// Förslag på listnamn utifrån filtret, t.ex. "Hotell och restaurang · Skåne län · 10–50 mnkr · med telefon och e-post"
function describe(f, facets) {
  const parts = [];
  if (f.section) parts.push(facets.sections.find((s) => s.id === f.section)?.label);
  if (f.sni) parts.push(/^\d/.test(f.sni) ? `SNI ${f.sni}` : f.sni);
  if (f.municipality) parts.push(f.municipality); else if (f.county) parts.push(f.county);
  if (f.revenue) parts.push(facets.revenues.find((r) => r.id === f.revenue)?.label);
  if (f.size) parts.push(facets.sizes.find((r) => r.id === f.size)?.label);
  if (f.form) parts.push(f.form);
  if (f.hasPhone && f.hasEmail) parts.push('telefon och e-post'); else if (f.hasPhone) parts.push('med telefon'); else if (f.hasEmail) parts.push('med e-post');
  return parts.filter(Boolean).join(' · ').slice(0, 60);
}

export const SearchController = {
  async index(root) {
    if (!facets) facets = await CompanyModel.facets();
    let view;
    let latest = 0;
    const run = async () => {
      // Bara det senaste anropet får rita. Annars kan ett långsamt svar för ett äldre filter skriva över det nya.
      const mine = ++latest;
      try {
        const data = await CompanyModel.search(filters);
        if (mine === latest) view.drawResults(data);
      } catch (e) { if (mine === latest) view.showError(e.message); }
    };
    const runDebounced = debounce(() => { filters.page = 1; run(); }, 300);

    view = renderSearch(root, {
      filters, facets, stages: state.config.stages, demo: state.config.demo, isAdmin: state.user.role === 'admin',
      onChange: (key, value, debounced) => {
        filters[key] = value;
        if (key === 'county') filters.municipality = '';
        if (debounced) runDebounced(); else { filters.page = 1; run(); }
      },
      onReset: () => { filters = { ...DEFAULT }; SearchController.index(root); },
      onOpen: (orgnr) => openCompany(orgnr, run),
      onBulk: () => {
        const snapshot = { ...filters, lead: '' };
        openBulkAdd({
          suggestion: describe(snapshot, facets),
          h: { preview: () => LeadModel.bulkPreview(snapshot), add: async (group, limit) => { const r = await LeadModel.bulkAdd(snapshot, group, limit); run(); return r; } },
        });
      },
      onAdd: async (orgnr) => {
        try { await LeadModel.add(orgnr); toast('Tillagd i leadtavlan'); run(); } catch (e) { toast(e.message, 'error'); }
      },
      onPage: (page) => { filters.page = page; run(); window.scrollTo(0, 0); },
    });
    run();
  },
};
