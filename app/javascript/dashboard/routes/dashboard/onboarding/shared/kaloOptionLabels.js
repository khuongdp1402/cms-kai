// Vietnamese labels for the upstream onboarding options (shared/constants.js).
// The stored values stay the upstream ones; only the shown label changes.
const OPTION_KEYS = {
  ROLE: {
    founder: 'FOUNDER',
    product_manager: 'PRODUCT_MANAGER',
    engineering: 'ENGINEERING',
    support_lead: 'SUPPORT_LEAD',
    marketing: 'MARKETING',
    sales: 'SALES',
    other: 'OTHER',
  },
  INDUSTRY: {
    'Aerospace & Defense': 'AEROSPACE',
    'Agriculture & Food': 'AGRICULTURE',
    'Automotive & Transportation': 'AUTOMOTIVE',
    'Chemicals & Materials': 'CHEMICALS',
    'Construction & Built Environment': 'CONSTRUCTION',
    'Consumer Packaged Goods (CPG)': 'CPG',
    Education: 'EDUCATION',
    Entertainment: 'ENTERTAINMENT',
    Finance: 'FINANCE',
    'Government & Nonprofit': 'GOVERNMENT',
    Healthcare: 'HEALTHCARE',
    'Hospitality & Tourism': 'HOSPITALITY',
    'Industrial & Energy': 'INDUSTRIAL',
    'Legal & Compliance': 'LEGAL',
    'Lifestyle & Leisure': 'LIFESTYLE',
    'Logistics & Supply Chain': 'LOGISTICS',
    'Luxury & Fashion': 'FASHION',
    'Beauty & Cosmetics': 'KALO_POLISH4.ONBOARDING.INDUSTRY.BEAUTY',
    'Food & Beverage': 'KALO_POLISH4.ONBOARDING.INDUSTRY.FOOD',
    'News & Media': 'MEDIA',
    'Professional Services & Agencies': 'SERVICES',
    'Real Estate & PropTech': 'REAL_ESTATE',
    'Retail & E-commerce': 'RETAIL',
    Sports: 'SPORTS',
    Technology: 'TECHNOLOGY',
    Telecommunications: 'TELECOM',
    Other: 'OTHER',
  },
  REFERRAL: {
    google: 'GOOGLE',
    facebook: 'KALO_POLISH4.ONBOARDING.REFERRAL.FACEBOOK',
    zalo: 'KALO_POLISH4.ONBOARDING.REFERRAL.ZALO',
    tiktok: 'KALO_POLISH4.ONBOARDING.REFERRAL.TIKTOK',
    reddit: 'REDDIT',
    twitter: 'TWITTER',
    linkedin: 'LINKEDIN',
    friend: 'FRIEND',
    blog: 'BLOG',
    github: 'GITHUB',
    other: 'OTHER',
  },
};

// Full i18n path for an option (Kalo-only options carry their own path).
const labelKey = (group, key) =>
  key.includes('.') ? key : `KALO_POLISH3.ONBOARDING.${group}.${key}`;

export const translateOptions = (options, group, t) =>
  options.map(option => {
    const key = OPTION_KEYS[group][option.value];
    return {
      value: option.value,
      label: key ? t(labelKey(group, key)) : option.label,
    };
  });

// Kalo order: what Vietnamese online shops pick most comes first, the rest
// keeps the upstream order and "Khác" stays last. Stored values stay plain
// strings (the API accepts any value).
const putFirst = (options, firstValues) => {
  const byValue = Object.fromEntries(options.map(o => [o.value, o]));
  const rest = options.filter(
    o => !firstValues.includes(o.value) && o.value.toLowerCase() !== 'other'
  );
  const other = options.filter(o => o.value.toLowerCase() === 'other');
  return [...firstValues.map(value => byValue[value]), ...rest, ...other];
};

export const kaloIndustryOptions = upstream =>
  putFirst(
    [
      ...upstream,
      { value: 'Beauty & Cosmetics', label: 'Beauty & Cosmetics' },
      { value: 'Food & Beverage', label: 'Food & Beverage' },
    ],
    [
      'Luxury & Fashion',
      'Beauty & Cosmetics',
      'Food & Beverage',
      'Retail & E-commerce',
      'Healthcare',
      'Lifestyle & Leisure',
    ]
  );

export const kaloReferralOptions = upstream =>
  putFirst(
    [
      ...upstream,
      { value: 'facebook', label: 'Facebook' },
      { value: 'zalo', label: 'Zalo' },
      { value: 'tiktok', label: 'TikTok' },
    ],
    ['facebook', 'zalo', 'tiktok', 'friend', 'google']
  );
