import { shallowMount, mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import ZaloPersonal from '../channels/ZaloPersonal.vue';
import AddAgents from '../AddAgents.vue';
import ChannelItem from 'dashboard/components/widgets/ChannelItem.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'vi',
  messages: { vi: viMessages },
});

describe('Zalo personal channel creation', () => {
  it('prefills the inbox name with "Zalo cá nhân"', async () => {
    global.axios = {
      post: vi.fn().mockRejectedValue({ response: { status: 500 } }),
      get: vi.fn().mockRejectedValue({ response: { status: 500 } }),
    };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    });
    await router.push('/');
    const wrapper = shallowMount(ZaloPersonal, {
      global: { plugins: [router, i18n] },
    });
    await flushPromises();
    expect(wrapper.find('input[type="text"]').element.value).toBe(
      'Zalo cá nhân'
    );
  });
});

describe('Inbox wizard: add agents step', () => {
  const mountStep = () => {
    const store = createStore({
      getters: {
        getCurrentUserID: () => 7,
        'agents/getAgents': () => [
          { id: 3, name: 'An' },
          { id: 7, name: 'Bình' },
        ],
      },
      actions: { 'agents/get': vi.fn() },
    });
    return shallowMount(AddAgents, {
      global: {
        plugins: [store, i18n],
        mocks: { $route: { params: { inbox_id: 1 } } },
        stubs: { TagInput: true, PageHeader: true, NextButton: true },
      },
    });
  };

  it('pre-selects the current user and keeps the dropdown closed on mount', async () => {
    const wrapper = mountStep();
    await flushPromises();
    expect(wrapper.vm.selectedAgentIds).toEqual([7]);
    const tagInput = wrapper.findComponent({ name: 'TagInput' });
    expect(tagInput.props('autoOpenDropdown')).toBe(false);
  });
});

describe('Channel picker: Facebook card', () => {
  const mountItem = (key, enabledFeatures = { channel_facebook: true }) =>
    mount(ChannelItem, {
      props: {
        channel: { key, title: key, description: 'd', icon: 'i-lucide-x' },
        enabledFeatures,
      },
      global: {
        plugins: [i18n],
        stubs: { Icon: true, Label: true },
        directives: { tooltip: {} },
      },
    });

  afterEach(() => {
    delete window.chatwootConfig;
  });

  it('explains why Facebook is unavailable without an app id', () => {
    window.chatwootConfig = {};
    const wrapper = mountItem('facebook');
    expect(wrapper.find('[data-test="channel-unavailable-hint"]').text()).toBe(
      'Sắp có — hiện dùng Zalo cá nhân'
    );
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('gives the disabled Instagram card the same reason', () => {
    window.chatwootConfig = {};
    const wrapper = mountItem('instagram', { channel_instagram: true });
    expect(wrapper.find('[data-test="channel-unavailable-hint"]').text()).toBe(
      'Sắp có — hiện dùng Zalo cá nhân'
    );
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('shows no hint when Facebook is configured or for other channels', () => {
    window.chatwootConfig = { fbAppId: '123' };
    expect(
      mountItem('facebook')
        .find('[data-test="channel-unavailable-hint"]')
        .exists()
    ).toBe(false);
    expect(
      mountItem('zalo_personal')
        .find('[data-test="channel-unavailable-hint"]')
        .exists()
    ).toBe(false);
  });
});
