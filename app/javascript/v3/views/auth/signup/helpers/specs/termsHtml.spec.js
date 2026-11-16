import { buildTermsHtml } from '../termsHtml';

const TEMPLATE =
  'agree <a href="https://www.chatwoot.com/terms">T&C</a> and <a href="https://www.chatwoot.com/privacy-policy">Privacy</a>';

describe('buildTermsHtml', () => {
  it('swaps in the configured URLs', () => {
    const html = buildTermsHtml(TEMPLATE, 'https://a.vn/t', 'https://a.vn/p');
    expect(html).toContain('href="https://a.vn/t"');
    expect(html).toContain('href="https://a.vn/p"');
    expect(html).not.toContain('chatwoot.com');
  });

  it.each([
    ['', ''],
    ['https://a.vn/t', ''],
    ['', 'https://a.vn/p'],
    [undefined, undefined],
  ])('returns an empty string when a URL is missing (%s, %s)', (t, p) => {
    expect(buildTermsHtml(TEMPLATE, t, p)).toBe('');
  });
});
