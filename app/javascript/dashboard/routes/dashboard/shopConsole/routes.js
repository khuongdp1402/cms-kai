import { frontendURL } from '../../../helper/URLHelper';
import ShopConsole from './ShopConsole.vue';

// The shop's own Console (guided UX spec §7). Administrators manage the shop;
// other roles see a link to their own profile.
export const routes = [
  {
    path: frontendURL('accounts/:accountId/console'),
    name: 'kalo_console',
    meta: { permissions: ['administrator', 'agent', 'custom_role'] },
    component: ShopConsole,
  },
];
