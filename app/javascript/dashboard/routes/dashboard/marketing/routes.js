import { frontendURL } from '../../../helper/URLHelper';
import MarketingPage from './MarketingPage.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/marketing'),
    name: 'kalo_marketing',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: MarketingPage,
  },
];
