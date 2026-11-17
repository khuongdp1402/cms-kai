// date-fns 2.21 has no global default locale, so dates and relative times come
// out in English unless a locale is passed. The dashboard entry keeps this in
// step with the vue-i18n locale; helpers below read it (reactively).
import { shallowRef } from 'vue';
import { format, formatDistanceToNow, isSameYear } from 'date-fns';
import { vi } from 'date-fns/locale';

const LOCALES = { vi };
// Day-before-month patterns for locales that read dates that way.
const RANGE_PATTERNS = {
  default: { short: 'MMM d', long: 'MMM d, yyyy' },
  vi: { short: 'd MMM', long: 'd MMM, yyyy' },
};

const current = shallowRef({ code: 'default', locale: undefined });

export const setDateLocale = code => {
  const base = String(code || '').split(/[-_]/)[0];
  current.value = LOCALES[base]
    ? { code: base, locale: LOCALES[base] }
    : { code: 'default', locale: undefined };
};

const withLocale = (options = {}) =>
  current.value.locale ? { ...options, locale: current.value.locale } : options;

// "3 phút trước" in Vietnamese, "3 minutes ago" otherwise.
export const relativeTime = date =>
  formatDistanceToNow(date, withLocale({ addSuffix: true }));

// "11 thg 11 - 17 thg 11, 2026" in Vietnamese, "Nov 11 - Nov 17, 2026" otherwise.
export const formatDateRange = (start, end) => {
  const patterns = RANGE_PATTERNS[current.value.code] || RANGE_PATTERNS.default;
  const startPattern = isSameYear(start, end) ? patterns.short : patterns.long;
  return `${format(start, startPattern, withLocale())} - ${format(
    end,
    patterns.long,
    withLocale()
  )}`;
};
