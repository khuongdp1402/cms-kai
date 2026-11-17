// Every KALO_CHAT_THREAD string must compile in vue-i18n. A bare "@" (or "{", "|")
// is message syntax and broke the note placeholder in the browser ("Invalid linked format").
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';

const leaves = (node, prefix) =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object'
      ? leaves(value, `${prefix}.${key}`)
      : [`${prefix}.${key}`]
  );

describe('KALO_CHAT_THREAD translations', () => {
  it('compile without errors and render without message syntax left over', () => {
    const errors = [];
    const i18n = createI18n({
      legacy: false,
      locale: 'vi',
      messages: { vi: viMessages },
      warnHtmlMessage: false,
      missingWarn: false,
      fallbackWarn: false,
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(msg => {
      errors.push(String(msg));
    });
    const keys = leaves(viMessages.KALO_CHAT_THREAD, 'KALO_CHAT_THREAD');
    const rendered = keys.map(key => i18n.global.t(key));
    spy.mockRestore();

    expect(keys.length).toBeGreaterThan(20);
    expect(errors).toEqual([]);
    rendered.forEach((text, index) => {
      expect(text, keys[index]).not.toBe(keys[index]);
      expect(text, keys[index]).not.toMatch(/[{}]/);
    });
    expect(
      i18n.global.t('KALO_CHAT_THREAD.COMPOSER.NOTE_PLACEHOLDER')
    ).toContain('@');
  });
});
