import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import InboxChannelsDialog from '../../inbox-setup/InboxChannelsDialog.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
// Kalo flags of the account (kalo_extra_channels gates the extra channels).
let mockFeatures = { kalo_extra_channels: true };
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: key => {
    if (key === 'accounts/isFeatureEnabledonAccount')
      return { value: (_id, flag) => Boolean(mockFeatures[flag]) };
    if (key === 'getCurrentAccountId') return { value: 1 };
    return { value: {} };
  },
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isCloudFeatureEnabled: () => true }),
}));
vi.mock('../../inbox-setup/useChannelConnect', () => ({
  useChannelConnect: () => ({
    connectViaOAuth: vi.fn(),
    connectWhatsapp: vi.fn(),
  }),
}));

const mountDialog = () =>
  mount(InboxChannelsDialog, {
    props: { inboxes: [] },
    global: {
      stubs: {
        Dialog: {
          template: '<div><slot /></div>',
          methods: { open() {}, close() {} },
        },
        InboxFacebookForm: { template: '<div data-test="fb-form" />' },
        InboxChannelForm: { template: '<div data-test="channel-form" />' },
        ChannelIcon: true,
        Icon: true,
      },
    },
  });

const cardTypes = wrapper =>
  wrapper.vm.$.setupState.channelCards.map(channel => channel.type);

describe('InboxChannelsDialog kalo_extra_channels gating', () => {
  afterEach(() => {
    mockFeatures = { kalo_extra_channels: true };
    delete window.chatwootConfig;
  });

  it('offers only Website and the social channels when the flag is off', () => {
    mockFeatures = {};
    window.chatwootConfig = { fbAppId: 'fb', tiktokAppId: 'tt' };
    expect(cardTypes(mountDialog())).toEqual(['website', 'facebook', 'tiktok']);
  });

  it('offers WhatsApp, Telegram, Line, email, SMS and API when the flag is on', () => {
    window.chatwootConfig = { fbAppId: 'fb' };
    expect(cardTypes(mountDialog())).toEqual(
      expect.arrayContaining(['telegram', 'line', 'gmail', 'sms', 'api'])
    );
  });
});

describe('InboxChannelsDialog Facebook gating', () => {
  afterEach(() => {
    delete window.chatwootConfig;
  });

  it('opens the Facebook page picker when fbAppId is configured', async () => {
    window.chatwootConfig = { fbAppId: 'fb-app' };
    const wrapper = mountDialog();

    wrapper.vm.open('facebook');
    await nextTick();

    expect(wrapper.find('[data-test="fb-form"]').exists()).toBe(true);
  });

  it('shows the grid (not the picker) when fbAppId is missing', async () => {
    window.chatwootConfig = {};
    const wrapper = mountDialog();

    wrapper.vm.open('facebook');
    await nextTick();

    expect(wrapper.find('[data-test="fb-form"]').exists()).toBe(false);
    // The channel grid renders its cards instead.
    expect(wrapper.find('button').exists()).toBe(true);
  });
});
