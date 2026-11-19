import { config } from '../config/index.js';
import { STAGES, CALL_OUTCOMES, PLANS, TRIAL_DAYS } from '../config/constants.js';
import { UserModel } from '../models/user.model.js';
import { CompanyModel } from '../models/company.model.js';

export const ConfigController = {
  // Öppen: används av klienten vid start (policytexter, steg, om första installation behövs)
  show: ({ user }) => ({
    appName: config.appName,
    controller: config.controller,
    policyUpdated: config.policyUpdated,
    idleMinutes: config.idleMinutes,
    stages: STAGES,
    callOutcomes: CALL_OUTCOMES,
    signup: config.allowSignup,
    plans: Object.values(PLANS),
    trialDays: TRIAL_DAYS,
    needsSetup: UserModel.count() === 0,
    demo: CompanyModel.countDemo() > 0,
    loggedIn: !!user,
  }),
};
