import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import KaloPage from '../KaloPage.vue';
import KaloPageHeader from '../KaloPageHeader.vue';
import KaloCard from '../KaloCard.vue';
import KaloAppShell from '../KaloAppShell.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'vi',
  messages: { vi: viMessages },
});

const wrappers = [];
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount());
  window.innerWidth = 1024;
});

const setWidth = width => {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
};

const mountPage = (slots, props = {}) => {
  const wrapper = mount(KaloPage, {
    props: { title: 'Đơn hàng', description: 'Mô tả một dòng', ...props },
    slots,
    attachTo: document.body,
    global: { plugins: [i18n] },
  });
  wrappers.push(wrapper);
  return wrapper;
};

describe('KaloPageHeader', () => {
  it('puts the title and description on the left and every action on the right', () => {
    const wrapper = mount(KaloPageHeader, {
      props: { title: 'Khách', description: 'Danh sách khách' },
      slots: { actions: '<button>Thêm khách</button>' },
    });
    expect(wrapper.find('h1').text()).toBe('Khách');
    expect(wrapper.find('[data-test-id="kalo-page-description"]').text()).toBe(
      'Danh sách khách'
    );
    expect(wrapper.find('[data-test-id="kalo-page-actions"]').text()).toBe(
      'Thêm khách'
    );
    expect(wrapper.find('header').classes()).toEqual(
      expect.arrayContaining(['sticky', 'top-0'])
    );
  });
});

describe('KaloCard', () => {
  it('renders title, actions, body and optional footer', () => {
    const wrapper = mount(KaloCard, {
      props: { title: 'Sản phẩm', description: 'Bán chạy' },
      slots: {
        actions: '<a>Xem</a>',
        default: '<p>Thân</p>',
        footer: '<span>Chân</span>',
      },
    });
    expect(wrapper.find('h2').text()).toBe('Sản phẩm');
    expect(wrapper.text()).toContain('Bán chạy');
    expect(wrapper.text()).toContain('Xem');
    expect(wrapper.text()).toContain('Thân');
    expect(wrapper.text()).toContain('Chân');
  });

  it('drops the header without title or actions and the padding when flush', () => {
    const wrapper = mount(KaloCard, {
      props: { flush: true },
      slots: { default: '<table />' },
    });
    expect(wrapper.find('h2').exists()).toBe(false);
    expect(wrapper.find('table').element.parentElement.className).not.toContain(
      'p-5'
    );
  });
});

describe('KaloAppShell', () => {
  it('shows the sidebar on wide screens and the tab bar when compact', async () => {
    const slots = {
      sidebar: '<nav data-test="rail" />',
      default: '<p data-test="main" />',
      tabbar: '<nav data-test="tabs" />',
    };
    const wide = mount(KaloAppShell, { slots });
    expect(wide.find('[data-test="rail"]').exists()).toBe(true);
    expect(wide.find('[data-test="tabs"]').exists()).toBe(false);
    expect(wide.find('main [data-test="main"]').exists()).toBe(true);
    const compact = mount(KaloAppShell, { props: { compact: true }, slots });
    expect(compact.find('[data-test="rail"]').exists()).toBe(false);
    expect(compact.find('[data-test="tabs"]').exists()).toBe(true);
  });
});

describe('KaloPage', () => {
  const columns = {
    default: '<p data-test="main-content">Giữa</p>',
    left: '<p data-test="left-content">Lọc</p>',
    right: '<p data-test="right-content">Hướng dẫn</p>',
    actions: '<button data-test="primary">Tạo đơn</button>',
  };

  it('renders the header, main slot and side columns on desktop (>= 1024px)', () => {
    setWidth(1280);
    const wrapper = mountPage(columns);
    expect(wrapper.find('h1').text()).toBe('Đơn hàng');
    expect(wrapper.text()).toContain('Mô tả một dòng');
    expect(
      wrapper
        .find('[data-test-id="kalo-page-main"] [data-test="main-content"]')
        .exists()
    ).toBe(true);
    expect(
      wrapper
        .find('[data-test-id="kalo-page-left"] [data-test="left-content"]')
        .exists()
    ).toBe(true);
    expect(
      wrapper
        .find('[data-test-id="kalo-page-right"] [data-test="right-content"]')
        .exists()
    ).toBe(true);
    expect(wrapper.find('[data-test-id="kalo-page-open-left"]').exists()).toBe(
      false
    );
  });

  it('moves the side columns into drawers under 1024px', async () => {
    setWidth(400);
    const wrapper = mountPage(columns);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test-id="kalo-page-left"]').exists()).toBe(
      false
    );
    expect(wrapper.find('[data-test-id="kalo-page-right"]').exists()).toBe(
      false
    );
    // Panel buttons sit with the actions on the right of the header.
    const actions = wrapper.find('[data-test-id="kalo-page-actions"]');
    expect(actions.text()).toContain('Bộ lọc');
    expect(actions.text()).toContain('Chi tiết');
    expect(actions.text()).toContain('Tạo đơn');

    await wrapper
      .find('[data-test-id="kalo-page-open-right"]')
      .trigger('click');
    const drawer = wrapper.find('[data-test-id="kalo-page-right-drawer"]');
    expect(drawer.find('[data-test="right-content"]').exists()).toBe(true);
    await drawer.find('[data-test-id="kalo-drawer-close"]').trigger('click');
    expect(
      wrapper.find('[data-test-id="kalo-page-right-drawer"]').exists()
    ).toBe(false);

    await wrapper.find('[data-test-id="kalo-page-open-left"]').trigger('click');
    expect(
      wrapper.find('[data-test-id="kalo-page-left-drawer"]').text()
    ).toContain('Lọc');
  });

  it('uses custom panel titles and needs no panel buttons without side columns', async () => {
    setWidth(400);
    const withTitle = mountPage(columns, { rightTitle: 'Ghi chú' });
    await withTitle.vm.$nextTick();
    expect(withTitle.find('[data-test-id="kalo-page-open-right"]').text()).toBe(
      'Ghi chú'
    );
    const plain = mountPage({ default: '<p>Giữa</p>' });
    expect(plain.find('[data-test-id="kalo-page-actions"]').exists()).toBe(
      false
    );
  });

  it('lets a page replace the header and keeps a sticky footer', () => {
    setWidth(1280);
    const wrapper = mountPage({
      header: '<header data-test="custom-header">Riêng</header>',
      default: '<p>Giữa</p>',
      footer: '<div data-test="pager">Trang</div>',
    });
    expect(wrapper.find('[data-test="custom-header"]').exists()).toBe(true);
    expect(wrapper.find('h1').exists()).toBe(false);
    expect(
      wrapper.find('[data-test="pager"]').element.parentElement.className
    ).toContain('sticky');
  });
});
