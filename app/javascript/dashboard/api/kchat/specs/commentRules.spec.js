import commentRulesAPI from '../commentRules';
import ApiClient from '../../ApiClient';

describe('#KchatCommentRulesAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = {
    get: vi.fn(() => Promise.resolve()),
    patch: vi.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    window.axios = axiosMock;
  });

  afterEach(() => {
    window.axios = originalAxios;
    vi.clearAllMocks();
  });

  it('fetches and updates comment automation rules', () => {
    expect(commentRulesAPI).toBeInstanceOf(ApiClient);

    commentRulesAPI.get();
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/comment_rules$/)
    );

    commentRulesAPI.update({ auto_hide_phone: true });
    expect(axiosMock.patch).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/comment_rules$/),
      { auto_hide_phone: true }
    );
  });
});
