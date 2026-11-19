import { tx, now } from '../../database/connection.js';
import { CompanyModel } from '../../models/company.model.js';
import { SuppressionModel } from '../../models/suppression.model.js';
import { MetaModel } from '../../models/meta.model.js';
import { mapRecord } from './record-mapper.js';

export const ImportService = {
  // Tar emot en (async) iterabel av råa poster och upsertar dem i batchar.
  // replace: källan är fullständig (SCB:s API), så fält som saknas i posten nollas i stället för att behållas.
  async importRecords(iterable, { source = 'scb', batch = 1000, replace = false } = {}) {
    const stats = { processed: 0, imported: 0, invalid: 0, suppressed: 0 };
    const ts = now();
    let rows = [];
    const flush = () => {
      if (!rows.length) return;
      tx(() => {
        for (const c of rows) {
          if (SuppressionModel.exists(c.orgnr)) { stats.suppressed++; continue; }
          CompanyModel.upsert(c, source, ts, { replace });
          stats.imported++;
        }
      });
      rows = [];
    };
    for await (const raw of iterable) {
      stats.processed++;
      const rec = mapRecord(raw);
      if (!rec) { stats.invalid++; continue; }
      rows.push(rec);
      if (rows.length >= batch) flush();
    }
    flush();
    MetaModel.set('last_import', JSON.stringify({ at: ts, source, ...stats }));
    CompanyModel.clearFacetCache();
    return stats;
  },
};
