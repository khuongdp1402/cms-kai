import { frontendURL } from '../../../helper/URLHelper';
import PosPage from './PosPage.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/pos'),
    name: 'kalo_pos',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: PosPage,
  },
];
