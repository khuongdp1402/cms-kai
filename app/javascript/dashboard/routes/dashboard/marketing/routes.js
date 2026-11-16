import { frontendURL } from '../../../helper/URLHelper';
import MarketingIndex from './MarketingIndex.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/marketing'),
    name: 'kalo_marketing',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: MarketingIndex,
  },
];
