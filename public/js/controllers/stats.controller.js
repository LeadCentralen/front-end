import { StatsModel } from '../models/stats.model.js';
import { renderStats } from '../views/stats.view.js';

let period = 30;
let userId = '';

export const StatsController = {
  async index(root) {
    const draw = async () => {
      const data = await StatsModel.calls(period, userId);
      renderStats(root, data, {
        period, userId,
        onPeriod: (d) => { period = d; draw().catch(() => {}); },
        onUser: (id) => { userId = id; draw().catch(() => {}); },
      });
    };
    await draw();
  },
};
