import { Readable } from 'node:stream';
import { readBody } from '../core/http.js';
import { tx } from '../database/connection.js';
import { CompanyModel } from '../models/company.model.js';
import { LeadModel } from '../models/lead.model.js';
import { SuppressionModel } from '../models/suppression.model.js';
import { MetaModel } from '../models/meta.model.js';
import { AuditLogModel } from '../models/audit-log.model.js';
import { ImportService } from '../services/import/import.service.js';
import { csvRecords } from '../services/import/csv-reader.js';
import { jsonRecords } from '../services/import/json-reader.js';

const ENCODINGS = ['utf-8', 'windows-1252', 'iso-8859-1'];

// Admin: registerstatistik, import av SCB-filer och rensning av demodata
export const DataController = {
  stats() {
    let lastImport = null;
    try { lastImport = JSON.parse(MetaModel.get('last_import')); } catch { /* ingen import än */ }
    return { ...CompanyModel.stats(), suppressed: SuppressionModel.count(), leads: LeadModel.count(), lastImport };
  },

  async importFile(ctx) {
    const buf = await readBody(ctx.req, 100 * 1024 * 1024);
    const encoding = ENCODINGS.includes(ctx.query.encoding) ? ctx.query.encoding : 'utf-8';
    const records = ctx.query.format === 'json' ? jsonRecords(buf) : csvRecords(Readable.from([buf]), encoding);
    const stats = await ImportService.importRecords(records, { source: 'scb' });
    AuditLogModel.record(ctx.user.id, 'import', `${stats.imported} poster`);
    return stats;
  },

  deleteDemo(ctx) {
    tx(() => {
      LeadModel.deleteForDemoCompanies();
      CompanyModel.deleteDemo();
    });
    CompanyModel.clearFacetCache();
    AuditLogModel.record(ctx.user.id, 'delete_demo');
    return { ok: true };
  },
};
