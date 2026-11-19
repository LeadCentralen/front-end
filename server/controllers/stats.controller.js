import { StatsService } from '../services/stats.service.js';
import { UserModel } from '../models/user.model.js';

export const StatsController = {
  // Kontoägare ser hela organisationens statistik (och kan välja en person). Vanliga användare ser bara sin egen.
  calls(ctx) {
    const days = Number(ctx.query.days) || 30;
    const manager = ['admin', 'owner'].includes(ctx.user.role);
    const orgId = ctx.user.org_id;
    const pick = Number(ctx.query.user) || null;
    const scopeUserId = manager ? (pick && UserModel.exists(pick, orgId) ? pick : null) : ctx.user.id;
    return {
      scope: manager ? (scopeUserId ? 'user' : 'team') : 'me',
      users: manager ? UserModel.listBasic(orgId) : [],
      ...StatsService.calls({ days, scopeUserId, orgId }),
      board: StatsService.board({ days, scopeUserId, orgId }),
    };
  },
};
