import { request, qs } from './http.js';

export const StatsModel = {
  calls: (days, user) => request('GET', '/stats/calls' + qs({ days, user })),
};
