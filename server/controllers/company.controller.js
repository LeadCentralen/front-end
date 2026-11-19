import { HttpError } from '../core/http-error.js';
import { CompanyModel } from '../models/company.model.js';
import { LeadModel } from '../models/lead.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { ScrapeGuard } from '../services/scrape-guard.service.js';

export const CompanyController = {
  index(ctx) {
    const { query } = ctx;
    const pageSize = Math.min(50, Math.max(10, Number(query.pageSize) || 25));
    const page = Math.max(1, Math.floor(Number(query.page)) || 1);
    const { maxPage } = ScrapeGuard.beforeSearch(ctx, page, pageSize);
    const { total, rows } = CompanyModel.search(query, { page, pageSize, orgId: ctx.user.org_id, reveal: ctx.user.role === 'admin' });
    ScrapeGuard.afterSearch(ctx, rows);
    return { total, page, pageSize, maxPage, rows };
  },

  facets: () => CompanyModel.facets(),

  show(ctx) {
    const { params } = ctx;
    ScrapeGuard.beforeDetail(ctx);
    const company = CompanyModel.findActive(params.orgnr);
    if (!company) throw new HttpError(404, 'Företaget hittades inte.');
    const lead = LeadModel.findByOrgnr(company.orgnr, ctx.user.org_id);
    company.has_phone = !!company.phone;
    company.has_email = !!company.email;
    if (!lead && ctx.user.role !== 'admin') { company.phone = null; company.email = null; } // visas när företaget ligger i tavlan
    company.orgnr = CompanyModel.publicRef(company); // personnummer lämnar aldrig servern
    delete company.rid;
    return { company, lead: lead && { ...lead, orgnr: company.orgnr }, activities: lead ? ActivityModel.forLead(lead.id) : [] };
  },
};
