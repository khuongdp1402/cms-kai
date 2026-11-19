import { mount, flushPromises } from '@vue/test-utils';
import CommentsPage from '../CommentsPage.vue';
import BrandPage from '../BrandPage.vue';
import { createPageTestEnv } from '../../reports/specs/kaloPageTestEnv';
import { expectTourTargets } from 'dashboard/components-next/guide/specs/tourTargets';

const mountPage = async component => {
  const { plugins } = createPageTestEnv();
  const wrapper = mount(component, {
    global: {
      plugins,
      stubs: {
        CommentAutomationSettings: true,
        BrandProfileForm: true,
        ContentCalendar: true,
        ContentIdeas: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('Bình luận and Thương hiệu tours', () => {
  it('renders every target of the Bình luận tour', async () => {
    expectTourTargets(await mountPage(CommentsPage), 'comments');
  });

  it('renders every target of the Thương hiệu tour', async () => {
    expectTourTargets(await mountPage(BrandPage), 'brand');
  });
});
