import { frontendURL } from '../../../helper/URLHelper';
import ProductsIndex from './ProductsIndex.vue';

// Catalog under Đơn hàng. Agents may open it (read-only); editing is admin only.
export const routes = [
  {
    path: frontendURL('accounts/:accountId/orders/products'),
    name: 'kalo_products',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: ProductsIndex,
  },
];
