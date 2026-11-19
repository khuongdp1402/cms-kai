import { frontendURL } from '../../../helper/URLHelper';
import OverviewIndex from './OverviewIndex.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/overview'),
    name: 'kalo_overview',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: OverviewIndex,
  },
];
