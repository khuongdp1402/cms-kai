import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import {
  INDUSTRY_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  USER_ROLE_OPTIONS,
} from '../../shared/constants';
import {
  kaloIndustryOptions,
  kaloReferralOptions,
  translateOptions,
} from '../../shared/kaloOptionLabels';

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

  it('puts the options Vietnamese shops pick first and keeps "Khác" last', () => {
    const industries = translateOptions(
      kaloIndustryOptions(INDUSTRY_OPTIONS),
      'INDUSTRY',
      t
    );
    expect(industries.slice(0, 3).map(o => o.label)).toEqual([
      'Thời trang, phụ kiện',
      'Mỹ phẩm, làm đẹp',
      'Ăn uống',
    ]);
    expect(industries.at(-1).value).toBe('Other');
    expect(industries).toHaveLength(INDUSTRY_OPTIONS.length + 2);

    const referrals = translateOptions(
      kaloReferralOptions(REFERRAL_SOURCE_OPTIONS),
      'REFERRAL',
      t
    );
    expect(referrals.slice(0, 4).map(o => o.label)).toEqual([
      'Facebook',
      'Zalo',
      'TikTok',
      'Bạn bè, đồng nghiệp',
    ]);
    expect(referrals.at(-1).value).toBe('other');
    referrals.concat(industries).forEach(option => {
      expect(option.label).not.toMatch(/^KALO_POLISH[34]\./);
    });
  });

  it('shows plain shop words', () => {
    const roles = translateOptions(USER_ROLE_OPTIONS, 'ROLE', t);
    expect(roles.find(o => o.value === 'founder').label).toBe('Chủ shop');
    const industries = translateOptions(INDUSTRY_OPTIONS, 'INDUSTRY', t);
    expect(industries.find(o => o.value === 'Retail & E-commerce').label).toBe(
      'Bán lẻ, bán hàng online'
    );
  });
});
