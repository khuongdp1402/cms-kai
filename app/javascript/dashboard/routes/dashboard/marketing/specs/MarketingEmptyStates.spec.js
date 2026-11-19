import { mount, flushPromises } from '@vue/test-utils';
import ContentCalendar from '../ContentCalendar.vue';
import ContentIdeas from '../ContentIdeas.vue';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import { createPageTestEnv } from '../../reports/specs/kaloPageTestEnv';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/kchat/contentIdeas', () => ({
  default: {
    overview: vi.fn(),
    saveCalendarItem: vi.fn(),
    deleteCalendarItem: vi.fn(),
  },
}));

const mountPage = async component => {
  const { plugins } = createPageTestEnv();
  const wrapper = mount(component, {
    attachTo: document.body,
    global: { plugins },
  });
  await flushPromises();
  return wrapper;
};

describe('Marketing empty states', () => {
  it('empty content calendar shows one sentence and a button that opens the add form', async () => {
    contentIdeasAPI.overview.mockResolvedValue({
      data: { calendar: [], jobs: [] },
    });
    const wrapper = await mountPage(ContentCalendar);
    const empty = wrapper.find('[data-test="calendar-empty"]');
    expect(empty.find('p').text()).toBe('Chưa có bài nào trong lịch nội dung.');
    expect(empty.findAll('button')).toHaveLength(1);
    expect(wrapper.find('[data-test="calendar-add-form"]').exists()).toBe(
      false
    );
    await wrapper.find('[data-test="calendar-empty-action"]').trigger('click');
    expect(wrapper.find('[data-test="calendar-add-form"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('a filter with no match says so without the add-first button', async () => {
    contentIdeasAPI.overview.mockResolvedValue({
      data: {
        calendar: [
          {
            id: 1,
            title: 'Bài 1',
            channel: 'tiktok',
            status: 'draft',
            scheduled_for: '2026-11-20',
          },
        ],
      },
    });
    const wrapper = await mountPage(ContentCalendar);
    await wrapper
      .findAll('button')
      .find(b => b.text() === 'Đã đăng')
      .trigger('click');
    const empty = wrapper.find('[data-test="calendar-empty"]');
    expect(empty.text()).toBe('Không có bài nào khớp bộ lọc.');
    expect(empty.find('button').exists()).toBe(false);
    wrapper.unmount();
  });

  it('content ideas without history shows one sentence and a button that focuses the topic field', async () => {
    contentIdeasAPI.overview.mockResolvedValue({ data: { jobs: [] } });
    const wrapper = await mountPage(ContentIdeas);
    const empty = wrapper.find('[data-test="ideas-empty"]');
    expect(empty.find('p').text()).toBe(
      'Chưa có ý tưởng nào, hãy nhập một chủ đề để AI gợi ý.'
    );
    await wrapper.find('[data-test="ideas-empty-action"]').trigger('click');
    expect(document.activeElement).toBe(
      wrapper.find('input[type="text"]').element
    );
    wrapper.unmount();
  });

  it('content ideas hides the empty state once history exists', async () => {
    contentIdeasAPI.overview.mockResolvedValue({
      data: {
        jobs: [{ id: 1, topic: 'nến', status: 'pending', angles: [] }],
      },
    });
    const wrapper = await mountPage(ContentIdeas);
    expect(wrapper.find('[data-test="ideas-empty"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
