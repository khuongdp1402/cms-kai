// Contacts popups follow guided UX spec §2: import, export and "save segment"
// open in KaloDrawer (the `dialogRef.open()/close()` contract is kept), and
// the contact details tabs fit the 440px column without scrolling.
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import viBase from 'dashboard/i18n/locale/vi';
import ContactExportDialog from 'dashboard/components-next/Contacts/ContactsForm/ContactExportDialog.vue';
import ContactImportDialog from 'dashboard/components-next/Contacts/ContactsForm/ContactImportDialog.vue';
import CreateSegmentDialog from 'dashboard/components-next/Contacts/ContactsForm/CreateSegmentDialog.vue';
import ContactManageView from '../pages/ContactManageView.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

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

const makeRouter = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        name: 'contacts_edit',
        path: '/app/accounts/:accountId/contacts/:contactId',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push('/app/accounts/1/contacts/7');
  return router;
};

const makeStore = () =>
  createStore({
    getters: {
      'contacts/getUIFlags': () => ({
        isExporting: false,
        isImporting: false,
        isFetchingItem: false,
      }),
      'contacts/getAppliedContactFilters': () => ({}),
      'contacts/getContactById': () => () => ({ id: 7, name: 'Lan' }),
      'customViews/getContactCustomViews': () => [],
      'customViews/getUIFlags': () => ({ isCreating: false }),
    },
    actions: {
      'contacts/show': vi.fn(),
      'contacts/fetchContactableInbox': vi.fn(),
    },
  });

const wrappers = [];
afterEach(() => wrappers.splice(0).forEach(w => w.unmount()));

const mountDialog = async component => {
  const wrapper = mount(component, {
    attachTo: document.body,
    global: { plugins: [await makeRouter(), makeStore(), makeI18n()] },
  });
  wrappers.push(wrapper);
  return wrapper;
};

describe('Contacts drawers', () => {
  it('opens export in a drawer and emits export from its footer', async () => {
    const wrapper = await mountDialog(ContactExportDialog);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    wrapper.vm.dialogRef.open();
    await flushPromises();
    const drawer = wrapper.find('[data-test-id="contact-export-drawer"]');
    expect(drawer.attributes('role')).toBe('dialog');
    expect(drawer.find('h2').text()).toBe('Xuất danh sách khách');
    await drawer
      .find('[data-test-id="contact-export-confirm"]')
      .trigger('click');
    await flushPromises();
    expect(wrapper.emitted('export')).toHaveLength(1);
    expect(
      wrapper.find('[data-test-id="contact-export-drawer"]').exists()
    ).toBe(false);
  });

  it('opens import in a drawer and keeps import disabled until a file is chosen', async () => {
    const wrapper = await mountDialog(ContactImportDialog);
    wrapper.vm.dialogRef.open();
    await flushPromises();
    const drawer = wrapper.find('[data-test-id="contact-import-drawer"]');
    expect(drawer.exists()).toBe(true);
    expect(
      drawer
        .find('[data-test-id="contact-import-confirm"]')
        .attributes('disabled')
    ).toBeDefined();
    expect(drawer.find('a[download]').exists()).toBe(true);
    wrapper.vm.dialogRef.close();
    await flushPromises();
    expect(
      wrapper.find('[data-test-id="contact-import-drawer"]').exists()
    ).toBe(false);
  });

  it('saves a segment from a drawer only with a name', async () => {
    const wrapper = await mountDialog(CreateSegmentDialog);
    wrapper.vm.dialogRef.open();
    await flushPromises();
    const drawer = wrapper.find('[data-test-id="create-segment-drawer"]');
    await drawer.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('create')).toBeUndefined();
    await drawer.find('input').setValue('Khách Hà Nội');
    await drawer.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('create')[0][0]).toEqual({
      name: 'Khách Hà Nội',
      filter_type: 1,
    });
  });
});

describe('Contact details tabs', () => {
  it('shows five equal icon tabs (no horizontal scroll) and switches the panel', async () => {
    const wrapper = mount(ContactManageView, {
      attachTo: document.body,
      global: {
        plugins: [await makeRouter(), makeStore(), makeI18n()],
        stubs: {
          ContactsDetailsLayout: {
            template:
              '<div><slot /><slot name="sidebarHeader" /><slot name="sidebar" /></div>',
          },
          ContactDetails: true,
          ContactCustomAttributes: {
            template: '<p data-test="panel-attributes" />',
          },
          ContactNotes: { template: '<p data-test="panel-notes" />' },
          ContactHistory: true,
          ContactMedia: true,
          ContactMerge: true,
        },
      },
    });
    wrappers.push(wrapper);
    await flushPromises();
    const list = wrapper.find('[data-test-id="contact-tabs"]');
    expect(list.classes()).toContain('grid-cols-5');
    expect(list.findAll('[role="tab"]')).toHaveLength(5);
    expect(list.text()).toContain('Ghi chú');
    expect(list.text()).not.toMatch(/Attributes|History|Media|Merge/);
    expect(wrapper.find('[data-test="panel-attributes"]').exists()).toBe(true);
    await wrapper.find('[data-test-id="contact-tab-notes"]').trigger('click');
    expect(
      wrapper
        .find('[data-test-id="contact-tab-notes"]')
        .attributes('aria-selected')
    ).toBe('true');
    expect(wrapper.find('[data-test="panel-notes"]').exists()).toBe(true);
  });

  it('links tabs to the panel and moves with the arrow keys', async () => {
    const wrapper = mount(ContactManageView, {
      attachTo: document.body,
      global: {
        plugins: [await makeRouter(), makeStore(), makeI18n()],
        stubs: {
          ContactsDetailsLayout: {
            template:
              '<div><slot name="sidebarHeader" /><slot name="sidebar" /></div>',
          },
          ContactDetails: true,
          ContactCustomAttributes: true,
          ContactNotes: true,
          ContactHistory: { template: '<p data-test="panel-history" />' },
          ContactMedia: true,
          ContactMerge: { template: '<p data-test="panel-merge" />' },
        },
      },
    });
    wrappers.push(wrapper);
    await flushPromises();
    const tab = value => wrapper.find(`[data-test-id="contact-tab-${value}"]`);
    const panel = wrapper.find('[role="tabpanel"]');
    expect(tab('attributes').attributes('aria-controls')).toBe(
      panel.attributes('id')
    );
    expect(panel.attributes('aria-labelledby')).toBe('contact-tab-attributes');
    expect(tab('attributes').attributes('tabindex')).toBe('0');
    expect(tab('notes').attributes('tabindex')).toBe('-1');

    await tab('attributes').trigger('keydown', { key: 'ArrowRight' });
    expect(tab('history').attributes('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('history').element);
    expect(wrapper.find('[data-test="panel-history"]').exists()).toBe(true);

    await tab('history').trigger('keydown', { key: 'ArrowLeft' });
    await tab('attributes').trigger('keydown', { key: 'ArrowLeft' });
    expect(tab('merge').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('[data-test="panel-merge"]').exists()).toBe(true);
  });
});
