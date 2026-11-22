import { frontendURL } from '../../../helper/URLHelper';
import MarketingIndex from './MarketingIndex.vue';
import CommentsPage from './CommentsPage.vue';
import CampaignsPage from './CampaignsPage.vue';
import BrandPage from './BrandPage.vue';
import PostsPage from './publishing/PostsPage.vue';

const meta = { permissions: ['administrator', 'agent', 'custom_role'] };

export const routes = [
  {
    path: frontendURL('accounts/:accountId/marketing'),
    name: 'kalo_marketing',
    meta,
    component: MarketingIndex,
  },
  {
    path: frontendURL('accounts/:accountId/marketing/comments'),
    name: 'kalo_comments',
    meta,
    component: CommentsPage,
  },
  {
    path: frontendURL('accounts/:accountId/marketing/campaigns'),
    name: 'kalo_campaigns',
    meta,
    component: CampaignsPage,
  },
  {
    path: frontendURL('accounts/:accountId/marketing/brand'),
    name: 'kalo_brand',
    meta,
    component: BrandPage,
  },
  {
    path: frontendURL('accounts/:accountId/marketing/posts'),
    name: 'kalo_posts',
    meta,
    component: PostsPage,
  },
];
