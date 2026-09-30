import { applyLocaleOverrides } from '../localeOverrides';

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
