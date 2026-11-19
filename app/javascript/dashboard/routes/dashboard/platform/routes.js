import { frontendURL } from '../../../helper/URLHelper';
import ConsoleLayout from './ConsoleLayout.vue';
import ConsoleOverview from './ConsoleOverview.vue';
import ConsoleShops from './ConsoleShops.vue';
import ConsolePayments from './ConsolePayments.vue';
import ConsoleMailInspector from './ConsoleMailInspector.vue';

// "Nền tảng": the platform owner's pages (guided UX spec §7). They used to
// live at /app/console; "Console" now is the shop's own page under
// /app/accounts/:accountId/console.
const meta = { platform: true };
const SECTIONS = ['overview', 'shops', 'payments', 'emails'];

export const routes = [
  {
    path: frontendURL('platform'),
    component: ConsoleLayout,
    redirect: { name: 'kalo_platform_overview' },
    meta,
    children: [
      {
        path: frontendURL('platform/overview'),
        name: 'kalo_platform_overview',
        meta,
        component: ConsoleOverview,
      },
      {
        path: frontendURL('platform/shops'),
        name: 'kalo_platform_shops',
        meta,
        component: ConsoleShops,
      },
      {
        path: frontendURL('platform/payments'),
        name: 'kalo_platform_payments',
        meta,
        component: ConsolePayments,
      },
      {
        path: frontendURL('platform/emails'),
        name: 'kalo_platform_emails',
        meta,
        component: ConsoleMailInspector,
      },
    ],
  },
  // Old bookmarks; the router guard picks the target (legacyConsoleTarget).
  {
    path: frontendURL('console/:section?'),
    name: 'kalo_legacy_console',
    meta: { legacyConsole: true },
    component: { render: () => null },
  },
];

// Platform pages are not account-scoped: only SuperAdmin may open them,
// everyone else goes back to the home route.
export const isPlatformRoute = route => Boolean(route.meta?.platform);

export const platformRedirect = user =>
  user?.type === 'SuperAdmin' ? null : frontendURL('');

export const isLegacyConsoleRoute = route => Boolean(route.meta?.legacyConsole);

/**
 * /app/console[/section] → SuperAdmin: the same platform section;
 * anyone else: the Console of their current shop.
 */
export const legacyConsoleTarget = (user, route) => {
  if (user?.type === 'SuperAdmin') {
    const section = SECTIONS.includes(route.params?.section)
      ? route.params.section
      : 'overview';
    return frontendURL(`platform/${section}`);
  }
  return user?.account_id
    ? frontendURL(`accounts/${user.account_id}/console`)
    : frontendURL('');
};
