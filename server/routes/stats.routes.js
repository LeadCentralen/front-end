import { StatsController } from '../controllers/stats.controller.js';

export function registerStatsRoutes(r) {
  r.get('/api/stats/calls', StatsController.calls);
}
