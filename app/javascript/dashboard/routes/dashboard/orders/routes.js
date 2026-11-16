import { frontendURL } from '../../../helper/URLHelper';
import OrdersPage from './OrdersPage.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/orders'),
    name: 'kalo_orders',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: OrdersPage,
  },
];
