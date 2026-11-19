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
    reddit: 'REDDIT',
    twitter: 'TWITTER',
    linkedin: 'LINKEDIN',
    friend: 'FRIEND',
    blog: 'BLOG',
    github: 'GITHUB',
    other: 'OTHER',
  },
};

export const translateOptions = (options, group, t) =>
  options.map(option => {
    const key = OPTION_KEYS[group][option.value];
    return {
      value: option.value,
      label: key ? t(`KALO_POLISH3.ONBOARDING.${group}.${key}`) : option.label,
    };
  });
