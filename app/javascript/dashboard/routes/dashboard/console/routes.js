import { frontendURL } from '../../../helper/URLHelper';
import ConsoleLayout from './ConsoleLayout.vue';
import ConsoleOverview from './ConsoleOverview.vue';
import ConsoleShops from './ConsoleShops.vue';
import ConsolePayments from './ConsolePayments.vue';
import ConsoleMailInspector from './ConsoleMailInspector.vue';

const meta = { console: true };

export const routes = [
  {
    path: frontendURL('console'),
    component: ConsoleLayout,
    redirect: { name: 'kalo_console_overview' },
    meta,
    children: [
      {
        path: frontendURL('console/overview'),
        name: 'kalo_console_overview',
        meta,
        component: ConsoleOverview,
      },
      {
        path: frontendURL('console/shops'),
        name: 'kalo_console_shops',
        meta,
        component: ConsoleShops,
      },
      {
        path: frontendURL('console/payments'),
        name: 'kalo_console_payments',
        meta,
        component: ConsolePayments,
      },
      {
        path: frontendURL('console/emails'),
        name: 'kalo_console_emails',
        meta,
        component: ConsoleMailInspector,
      },
    ],
  },
];

// Console is not account-scoped: only SuperAdmin may open it,
// everyone else goes back to the home route.
export const isConsoleRoute = route => Boolean(route.meta?.console);

export const consoleRedirect = user =>
  user?.type === 'SuperAdmin' ? null : frontendURL('');
