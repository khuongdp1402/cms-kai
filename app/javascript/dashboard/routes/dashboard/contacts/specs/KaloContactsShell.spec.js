import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import viBase from 'dashboard/i18n/locale/vi';
import ContactsIndex from '../pages/ContactsIndex.vue';
import ContactHeader from 'dashboard/components-next/Contacts/ContactsHeader/ContactHeader.vue';
import ContactsDetailsLayout from 'dashboard/components-next/Contacts/ContactsDetailsLayout.vue';
import PaginationFooter from 'dashboard/components-next/pagination/PaginationFooter.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

// The app layers the ktech overlay over the upstream Vietnamese locale.
const deepMerge = (base, overlay) =>
  Object.fromEntries(
    [...new Set([...Object.keys(base), ...Object.keys(overlay)])].map(key => {
      const a = base[key];
      const b = overlay[key];
      if (
        a &&
        b &&
        typeof a === 'object' &&
        typeof b === 'object' &&
        !Array.isArray(a)
      ) {
        return [key, deepMerge(a, b)];
      }
      return [key, b ?? a];
    })
  );

const makeI18n = () =>
  createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: deepMerge(viBase, viMessages) },
  });

const makeRouter = async (name = 'contacts_dashboard_index') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      'contacts_dashboard_index',
      'contacts_dashboard_active',
      'contacts_edit',
    ].map(routeName => ({
      name: routeName,
      path: `/app/accounts/:accountId/${routeName}/:contactId?`,
      component: { template: '<div />' },
    })),
  });
  await router.push({ name, params: { accountId: 1, contactId: 7 } });
  return router;
};

const makeStore = () =>
  createStore({
    getters: {
      getUISettings: () => ({}),
      'contacts/getContactsList': () => [],
      'contacts/getUIFlags': () => ({ isFetching: false }),
      'contacts/getAppliedContactFilters': () => [],
      'contacts/getMeta': () => ({ count: 0, currentPage: 1 }),
      'customViews/getUIFlags': () => ({ isFetching: false }),
      'customViews/getContactCustomViews': () => [],
      'inboxes/getInboxes': () => [],
    },
    actions: {
      updateUISettings: vi.fn(),
      'contacts/get': vi.fn(),
      'contacts/clearContactFilters': vi.fn(),
    },
  });

const wrappers = [];
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount());
  window.innerWidth = 1024;
});

describe('Khách list (KaloPage shell)', () => {
  const mountIndex = async () => {
    const router = await makeRouter();
    const wrapper = mount(ContactsIndex, {
      attachTo: document.body,
      global: {
        plugins: [router, makeStore(), makeI18n()],
        stubs: {
          // Header / quick bar are covered separately; keep the page body.
          ContactsListLayout: {
            props: ['headerTitle'],
            template:
              '<section><h1 data-test="title">{{ headerTitle }}</h1><slot /></section>',
          },
          ContactsForm: { template: '<div data-test="contacts-form" />' },
        },
      },
    });
    wrappers.push(wrapper);
    await flushPromises();
    return wrapper;
  };

  it('is titled "Khách"', async () => {
    const wrapper = await mountIndex();
    expect(wrapper.find('[data-test="title"]').text()).toBe('Khách');
  });

  it('shows a Vietnamese empty state with one action and no fake demo contacts', async () => {
    const wrapper = await mountIndex();
    const empty = wrapper.find('[data-test-id="contacts-empty-state"]');
    expect(empty.find('h2').text()).toBe('Chưa có khách nào');
    expect(empty.findAll('button')).toHaveLength(1);
    expect(empty.find('button').text()).toBe('Thêm khách');
    expect(wrapper.findComponent({ name: 'ContactsCard' }).exists()).toBe(
      false
    );
    expect(wrapper.text()).not.toMatch(/@|Showing|contact/i);
  });

  it('opens "Thêm khách" in a right drawer', async () => {
    const wrapper = await mountIndex();
    await wrapper
      .find('[data-test-id="contacts-empty-state"] button')
      .trigger('click');
    const drawer = wrapper.find('[data-test-id="create-contact-drawer"]');
    expect(drawer.attributes('role')).toBe('dialog');
    expect(drawer.find('h2').text()).toBe('Thêm khách');
    expect(drawer.find('[data-test="contacts-form"]').exists()).toBe(true);
    await drawer.find('[data-test-id="kalo-drawer-close"]').trigger('click');
    expect(
      wrapper.find('[data-test-id="create-contact-drawer"]').exists()
    ).toBe(false);
  });
});

describe('Khách header', () => {
  it('puts title, description and a primary "Thêm khách" on the shared header', async () => {
    const wrapper = mount(ContactHeader, {
      props: {
        headerTitle: 'Khách',
        description: 'Người đã nhắn tin',
        addLabel: 'Thêm khách',
        buttonLabel: 'Tin nhắn',
      },
      global: {
        plugins: [makeI18n()],
        stubs: {
          ContactSortMenu: true,
          ContactMoreActions: true,
          ComposeConversation: {
            template: '<div><slot name="trigger" /></div>',
          },
        },
      },
    });
    expect(wrapper.find('[data-test-id="kalo-page-header"] h1').text()).toBe(
      'Khách'
    );
    expect(wrapper.text()).toContain('Người đã nhắn tin');
    const add = wrapper.find('[data-test-id="contacts-add"]');
    expect(add.text()).toBe('Thêm khách');
    await add.trigger('click');
    expect(wrapper.emitted('add')).toHaveLength(1);
  });
});

describe('Pagination in Vietnamese', () => {
  it('translates the contacts pagination footer', () => {
    const wrapper = mount(PaginationFooter, {
      props: {
        currentPage: 1,
        totalItems: 40,
        itemsPerPage: 15,
        currentPageInfo: 'CONTACTS_LAYOUT.PAGINATION_FOOTER.SHOWING',
      },
      global: { plugins: [makeI18n()] },
    });
    expect(wrapper.text()).toContain('Đang xem 1 - 15 trên 40 khách');
    expect(wrapper.text()).toContain('/ 3 trang');
    expect(wrapper.text()).not.toMatch(/Showing| of /);
  });
});

describe('Khách details (KaloPage shell)', () => {
  const mountDetails = async width => {
    window.innerWidth = width;
    const router = await makeRouter('contacts_edit');
    const wrapper = mount(ContactsDetailsLayout, {
      props: { selectedContact: { id: 7, name: 'Lan' } },
      slots: {
        default: '<p data-test="details">Thông tin</p>',
        sidebarHeader: '<nav data-test="tabs">Tab</nav>',
        sidebar: '<p data-test="notes">Ghi chú của Lan</p>',
      },
      attachTo: document.body,
      global: {
        plugins: [router, makeStore(), makeI18n()],
        stubs: {
          VoiceCallButton: true,
          ComposeConversation: {
            template: '<div><slot name="trigger" /></div>',
          },
        },
      },
    });
    wrappers.push(wrapper);
    await flushPromises();
    return wrapper;
  };

  it('labels the breadcrumb "Khách" and shows the notes column on desktop', async () => {
    const wrapper = await mountDetails(1280);
    expect(wrapper.find('[data-test-id="kalo-page-header"]').text()).toContain(
      'Khách'
    );
    const right = wrapper.find('[data-test-id="kalo-page-right"]');
    expect(right.find('[data-test="tabs"]').exists()).toBe(true);
    expect(right.find('[data-test="notes"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="contact-open-details"]').exists()).toBe(
      false
    );
  });

  it('moves notes and history into a drawer under 1024px', async () => {
    const wrapper = await mountDetails(400);
    expect(wrapper.find('[data-test-id="kalo-page-right"]').exists()).toBe(
      false
    );
    const open = wrapper.find('[data-test-id="contact-open-details"]');
    expect(open.text()).toBe('Ghi chú và lịch sử');
    await open.trigger('click');
    const drawer = wrapper.find('[data-test-id="kalo-page-right-drawer"]');
    expect(drawer.find('[data-test="notes"]').exists()).toBe(true);
  });
});
