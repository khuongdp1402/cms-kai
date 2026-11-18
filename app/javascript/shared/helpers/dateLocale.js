// date-fns 2.21 has no global default locale, so dates and relative times come
// out in English unless a locale is passed. The dashboard entry keeps this in
// step with the vue-i18n locale; helpers below read it (reactively).
import { shallowRef } from 'vue';
import { format, formatDistanceToNow, isSameYear } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import { formatTime } from '@chatwoot/utils';

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

// Locale-aware date-fns `format` ("tháng 11" for 'MMMM' in Vietnamese).
export const formatLocalized = (date, pattern) =>
  format(date, pattern, withLocale());

// "12 thg 11, 2026" in Vietnamese, "Nov 12, 2026" otherwise.
export const formatDayDate = date => {
  const patterns = RANGE_PATTERNS[current.value.code] || RANGE_PATTERNS.default;
  return format(date, patterns.long, withLocale());
};

// Month heading for a calendar: "Tháng 11" in Vietnamese, "November" otherwise.
export const formatMonthName = date => {
  const name = format(date, 'MMMM', withLocale());
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Narrow weekday labels starting on Monday: T2 … CN in Vietnamese, M … S otherwise.
export const weekdayLabels = () => {
  const locale = current.value.locale || enUS;
  return [1, 2, 3, 4, 5, 6, 0].map(day =>
    locale.localize.day(day, { width: 'narrow' })
  );
};

const VI_UNITS = { day: 'ngày', hour: 'giờ', minute: 'phút', second: 'giây' };
const joinUnits = (major, majorUnit, minor, minorUnit) =>
  `${major} ${VI_UNITS[majorUnit]}${
    minor > 0 ? ` ${minor} ${VI_UNITS[minorUnit]}` : ''
  }`;

// Durations for reports, with the same rounding as @chatwoot/utils formatTime:
// "14 phút 36 giây" in Vietnamese, "14 Min 36 Sec" otherwise.
export const formatDuration = timeInSeconds => {
  if (current.value.code !== 'vi') return formatTime(timeInSeconds);
  const total = Number(timeInSeconds) || 0;
  if (total >= 86400) {
    const days = Math.floor(total / 86400);
    const hours =
      total % 86400 < 3600 || days >= 364
        ? 0
        : Math.floor((total % 86400) / 3600);
    return joinUnits(days, 'day', hours, 'hour');
  }
  if (total >= 3600) {
    const hours = Math.floor(total / 3600);
    const minutes =
      total % 3600 < 60 || hours === 24 ? 0 : Math.floor((total % 3600) / 60);
    return joinUnits(hours, 'hour', minutes, 'minute');
  }
  if (total >= 60) {
    const minutes = Math.floor(total / 60);
    return joinUnits(minutes, 'minute', Math.floor(total % 60), 'second');
  }
  return `${Math.floor(total)} ${VI_UNITS.second}`;
};
