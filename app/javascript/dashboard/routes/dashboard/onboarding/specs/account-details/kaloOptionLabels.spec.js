import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import {
  INDUSTRY_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  USER_ROLE_OPTIONS,
} from '../../shared/constants';
import { translateOptions } from '../../shared/kaloOptionLabels';

const { t } = createI18n({
  legacy: false,
  locale: 'vi',
  messages: { vi: viMessages },
}).global;

describe('onboarding option labels', () => {
  it.each([
    ['ROLE', USER_ROLE_OPTIONS],
    ['INDUSTRY', INDUSTRY_OPTIONS],
    ['REFERRAL', REFERRAL_SOURCE_OPTIONS],
  ])(
    'every %s option has a Vietnamese label and keeps its value',
    (group, options) => {
      const translated = translateOptions(options, group, t);
      expect(translated.map(o => o.value)).toEqual(options.map(o => o.value));
      translated.forEach(option => {
        expect(option.label).not.toMatch(/^KALO_POLISH3\./);
      });
    }
  );

  it('shows plain shop words', () => {
    const roles = translateOptions(USER_ROLE_OPTIONS, 'ROLE', t);
    expect(roles.find(o => o.value === 'founder').label).toBe('Chủ shop');
    const industries = translateOptions(INDUSTRY_OPTIONS, 'INDUSTRY', t);
    expect(industries.find(o => o.value === 'Retail & E-commerce').label).toBe(
      'Bán lẻ, bán hàng online'
    );
  });
});
