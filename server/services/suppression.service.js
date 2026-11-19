import { tx } from '../database/connection.js';
import { CompanyModel } from '../models/company.model.js';
import { LeadModel } from '../models/lead.model.js';
import { SuppressionModel } from '../models/suppression.model.js';

export const SuppressionService = {
  // Spärrar ett företag: döljs överallt, leadet raderas och framtida importer hoppar över det.
  suppress(orgnr, reason) {
    tx(() => {
      SuppressionModel.add(orgnr, reason);
      CompanyModel.setSuppressed(orgnr, true);
      LeadModel.deleteByOrgnr(orgnr);
    });
    CompanyModel.clearFacetCache();
  },
  release(orgnr) {
    SuppressionModel.remove(orgnr);
    CompanyModel.setSuppressed(orgnr, false);
    CompanyModel.clearFacetCache();
  },
};
