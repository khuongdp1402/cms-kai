import CannedIndex from '../canned/Index.vue';
import InboxIndex from '../inbox/Index.vue';
import LabelsIndex from '../labels/Index.vue';
import { mountSettingsPage } from './kaloSettingsPageEnv';

vi.mock('../canned/AddCanned.vue', () => ({ default: { template: '<i />' } }));
vi.mock('../canned/EditCanned.vue', () => ({ default: { template: '<i />' } }));
vi.mock('../labels/AddLabel.vue', () => ({ default: { template: '<i />' } }));
vi.mock('../labels/EditLabel.vue', () => ({ default: { template: '<i />' } }));

const CANNED = [
  { id: 1, short_code: 'ship', content: 'Phí ship 30k' },
  { id: 2, short_code: 'stk', content: 'STK 0123 Vietcombank' },
];

describe('Kalo settings list pages', () => {
  describe('Trả lời nhanh (canned responses)', () => {
    const mountCanned = () => {
      const sorted = vi.fn(order =>
        order === 'desc' ? [...CANNED].reverse() : CANNED
      );
      return mountSettingsPage(CannedIndex, {
        getters: {
          getSortedCannedResponses: () => sorted,
          getUIFlags: () => ({ fetchingList: false }),
        },
        actions: { getCannedResponse: vi.fn() },
      }).then(env => ({ ...env, sorted }));
    };

    it('lists each reply as a card and keeps the A-Z / Z-A sort toggle', async () => {
      const { wrapper, sorted } = await mountCanned();
      const rows = () =>
        wrapper.findAll('[data-test="canned-row"]').map(r => r.text());
      expect(rows()[0]).toContain('ship');
      expect(rows()[0]).toContain('Phí ship 30k');

      await wrapper.find('[data-test="canned-sort"]').trigger('click');
      expect(sorted).toHaveBeenLastCalledWith('desc');
      expect(rows()[0]).toContain('stk');
    });

    it('asks in Vietnamese before deleting', async () => {
      const { wrapper } = await mountCanned();
      const modal = wrapper.findComponent({ name: 'WootDeleteModal' });
      expect(modal.props('confirmText')).toBe('Xóa');
      expect(modal.props('rejectText')).toBe('Giữ lại');
      expect(modal.props('title')).toBe('Xóa câu mẫu?');
    });

    it('has a back link to the settings hub', async () => {
      const { wrapper } = await mountCanned();
      expect(
        wrapper.find('[data-test="settings-back-to-hub"]').text()
      ).toContain('Cài đặt');
    });
  });

  describe('Kênh nhận tin (inbox list)', () => {
    const INBOXES = [
      { id: 7, name: 'Zalo shop', channel_type: 'Channel::ZaloPersonal' },
    ];
    const mountInboxes = (opts = {}) =>
      mountSettingsPage(InboxIndex, {
        getters: {
          'inboxes/getInboxes': () => opts.inboxes ?? INBOXES,
          'inboxes/getUIFlags': () => ({ isFetching: false }),
        },
        routes: ['settings_inbox_show', 'settings_inbox_new'],
        isAdmin: opts.isAdmin ?? true,
      });

    it('opens the inbox settings when an admin clicks the row', async () => {
      const { wrapper, router } = await mountInboxes();
      await wrapper.find('[data-test="inbox-row"]').trigger('click');
      await vi.waitFor(() =>
        expect(router.currentRoute.value.name).toBe('settings_inbox_show')
      );
      expect(router.currentRoute.value.params.inboxId).toBe('7');
    });

    it('does not navigate for an agent', async () => {
      const { wrapper, router } = await mountInboxes({ isAdmin: false });
      await wrapper.find('[data-test="inbox-row"]').trigger('click');
      expect(router.currentRoute.value.name).toBe('settings_page');
    });

    it('shows a friendly empty state with one call to action', async () => {
      const { wrapper } = await mountInboxes({ inboxes: [] });
      const empty = wrapper.find('[data-test="settings-empty"]');
      expect(empty.text()).toContain('Chưa có kênh nào');
      expect(empty.text()).toContain('Kết nối kênh đầu tiên');
    });
  });

  describe('Nhãn (labels)', () => {
    it('shows the label colour swatch with its code', async () => {
      const { wrapper } = await mountSettingsPage(LabelsIndex, {
        getters: {
          'labels/getLabels': () => [
            {
              id: 1,
              title: 'khach-quen',
              description: 'VIP',
              color: '#ff0000',
            },
          ],
          'labels/getUIFlags': () => ({ isFetching: false }),
        },
        actions: { 'labels/get': vi.fn() },
      });
      const row = wrapper.find('[data-test="label-row"]');
      expect(row.text()).toContain('khach-quen');
      expect(row.find('[title="#ff0000"]').exists()).toBe(true);
    });
  });
});
