// Startpunkt: npm start
import { config } from './config/index.js';
import { createApp } from './app.js';
import { MaintenanceService } from './services/maintenance.service.js';
import { CompanyModel } from './models/company.model.js';

MaintenanceService.purge();
CompanyModel.facets(); // värmer upp filtervalen (en tabellskanning) så att första besökaren slipper vänta
setInterval(() => MaintenanceService.purge(), 6 * 3600e3).unref();

createApp().listen(config.port, config.host, () => {
  console.log(`Leadcentralen körs på http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`);
});
