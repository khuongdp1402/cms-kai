import { applyLocaleOverrides, applyKaloFallback } from '../localeOverrides';

describe('applyLocaleOverrides', () => {
  const messages = {
    en: { SIDEBAR: { INBOX: 'My Inbox', REPORTS: 'Reports' } },
    vi: {
      SIDEBAR: { INBOX: 'My Inbox', REPORTS: 'Báo cáo' },
      LOGIN: 'Đăng nhập',
    },
  };

  it('deep merges override strings into the matching locale', () => {
    const result = applyLocaleOverrides(messages, {
      vi: { SIDEBAR: { INBOX: 'Hộp thư của tôi' } },
    });
    expect(result.vi).toEqual({
      SIDEBAR: { INBOX: 'Hộp thư của tôi', REPORTS: 'Báo cáo' },
      LOGIN: 'Đăng nhập',
    });
    expect(result.en).toBe(messages.en);
  });

  it('adds keys missing from the locale', () => {
    const result = applyLocaleOverrides(messages, {
      vi: { SIDEBAR: { SEARCH: 'Tìm kiếm' } },
    });
    expect(result.vi.SIDEBAR.SEARCH).toBe('Tìm kiếm');
  });

  it('ignores overrides for locales that are not loaded', () => {
    const result = applyLocaleOverrides(messages, { fr: { A: 'B' } });
    expect(result).toEqual(messages);
  });

  it('does not mutate the input messages', () => {
    applyLocaleOverrides(messages, { vi: { SIDEBAR: { INBOX: 'X' } } });
    expect(messages.vi.SIDEBAR.INBOX).toBe('My Inbox');
  });
});

describe('applyKaloFallback', () => {
  const kalo = {
    KALO_NAV: { ORDERS: 'Đơn hàng' },
    KALO_POS: { TITLE: 'Bán tại quầy' },
    LOGIN: 'Đăng nhập',
  };
  const messages = {
    en: { LOGIN: 'Login' },
    fr: { LOGIN: 'Connexion', KALO_NAV: { ORDERS: 'Commandes' } },
    vi: { LOGIN: 'Đăng nhập' },
  };

  it('fills KALO_ namespaces missing from every locale with the Vietnamese text', () => {
    const result = applyKaloFallback(messages, kalo);
    expect(result.en.KALO_NAV.ORDERS).toBe('Đơn hàng');
    expect(result.en.KALO_POS.TITLE).toBe('Bán tại quầy');
    expect(result.fr.KALO_POS.TITLE).toBe('Bán tại quầy');
  });

  it('never overrides an existing translation or a non-KALO key', () => {
    const result = applyKaloFallback(messages, kalo);
    expect(result.fr.KALO_NAV.ORDERS).toBe('Commandes');
    expect(result.en.LOGIN).toBe('Login');
    expect(result.fr.LOGIN).toBe('Connexion');
  });
});
