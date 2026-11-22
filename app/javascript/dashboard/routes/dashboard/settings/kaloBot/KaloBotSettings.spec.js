import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import botConfigAPI from 'dashboard/api/kchat/botConfig';
import KaloBotSettings from './KaloBotSettings.vue';

const alertMock = vi.hoisted(() => vi.fn());
vi.mock('dashboard/composables', () => ({ useAlert: alertMock }));
vi.mock('dashboard/api/kchat/botConfig', () => ({
  default: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
  },
}));

describe('KaloBotSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    botConfigAPI.getConfig.mockResolvedValue({
      data: {
        enabled: false,
        pause_when_agent_active: true,
        welcome_enabled: true,
        welcome_message: 'Xin chào',
        auto_suggest_products: true,
        handoff_enabled: false,
        handoff_message: '',
        rules: [],
      },
    });
    botConfigAPI.updateConfig.mockImplementation(payload =>
      Promise.resolve({ data: payload })
    );
  });

  it('loads config, adds a hotel preset rule, attaches a product, and saves', async () => {
    const fetch = vi.fn().mockResolvedValue([]);
    const store = createStore({
      modules: {
        kchatProducts: {
          namespaced: true,
          getters: {
            getProducts: () => [
              { id: 10, name: 'Phòng Deluxe', price: 2400000 },
            ],
          },
          actions: { fetch },
        },
      },
    });
    const i18n = createI18n({
      legacy: false,
      locale: 'vi',
      messages: { vi: viMessages },
    });

    const wrapper = mount(KaloBotSettings, {
      global: {
        plugins: [store, i18n],
        stubs: { RouterLink: { template: '<a><slot /></a>' } },
      },
    });
    await flushPromises();

    await wrapper.find('[data-test="bot-enabled"]').setValue(true);
    await wrapper.find('[data-test="bot-preset-hotel"]').trigger('click');
    await wrapper.find('[data-test="bot-rule-product"]').trigger('click');
    await wrapper.find('[data-test="bot-save"]').trigger('click');
    await flushPromises();

    expect(botConfigAPI.updateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        rules: [
          expect.objectContaining({
            name: 'Tư vấn đặt phòng Khách sạn',
            keywords: [
              'khách sạn',
              'phòng',
              'resort',
              'check-in',
              'nhận phòng',
            ],
            product_ids: [10],
            assign_labels: ['khach_san', 'can_tu_van'],
          }),
        ],
      })
    );
    expect(alertMock).toHaveBeenCalledWith(viMessages.KALO_BOT.SAVED);
  });
});
