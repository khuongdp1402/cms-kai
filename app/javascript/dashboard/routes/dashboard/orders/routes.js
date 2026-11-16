import { frontendURL } from '../../../helper/URLHelper';
import OrdersIndex from './OrdersIndex.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/orders'),
    name: 'kalo_orders',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: OrdersIndex,
  },
];
