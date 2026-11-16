import { frontendURL } from '../../../helper/URLHelper';
import ReportsIndex from './ReportsIndex.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/reports'),
    name: 'kalo_reports',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: ReportsIndex,
  },
];
