import { state } from '../state.js';
import { AccountModel } from '../models/account.model.js';
import { renderLegal } from '../views/legal.view.js';

export const LegalController = {
  show(root, id) {
    renderLegal(root, {
      id, config: state.config, user: state.user,
      onRemovalRequest: (data) => AccountModel.requestRemoval(data),
    });
  },
};
