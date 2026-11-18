import {
  formatDateRange,
  formatDayDate,
  formatDuration,
  formatLocalized,
  formatMonthName,
  relativeTime,
  setDateLocale,
  weekdayLabels,
} from '../dateLocale';

describe('dateLocale', () => {
  const start = new Date(2026, 10, 11);
  const end = new Date(2026, 10, 17);

  afterEach(() => setDateLocale('en'));

  it('keeps English output for non-Vietnamese locales', () => {
    setDateLocale('en');
    expect(formatDateRange(start, end)).toBe('Nov 11 - Nov 17, 2026');
    expect(relativeTime(new Date(Date.now() - 3 * 60 * 1000))).toBe(
      '3 minutes ago'
    );
  });

  it('formats in Vietnamese when the app locale is vi', () => {
    setDateLocale('vi');
    expect(formatDateRange(start, end)).toBe('11 thg 11 - 17 thg 11, 2026');
    expect(relativeTime(new Date(Date.now() - 3 * 60 * 1000))).toBe(
      '3 phút trước'
    );
  });

  it('shows both years when the range crosses a year', () => {
    setDateLocale('vi_VN');
    expect(formatDateRange(new Date(2025, 11, 30), end)).toBe(
      '30 thg 12, 2025 - 17 thg 11, 2026'
    );
  });

  it('formats single dates, month headings and weekday labels per locale', () => {
    const day = new Date(2026, 10, 12);
    setDateLocale('en');
    expect(formatDayDate(day)).toBe('Nov 12, 2026');
    expect(formatMonthName(day)).toBe('November');
    expect(formatLocalized(day, 'MMM')).toBe('Nov');
    expect(weekdayLabels()).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);

    setDateLocale('vi');
    expect(formatDayDate(day)).toBe('12 thg 11, 2026');
    expect(formatMonthName(day)).toBe('Tháng 11');
    expect(formatLocalized(day, 'MMM')).toBe('thg 11');
    expect(weekdayLabels()).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
  });

  it('formats report durations per locale', () => {
    setDateLocale('en');
    expect(formatDuration(876)).toBe('14 Min 36 Sec');

    setDateLocale('vi');
    expect(formatDuration(876)).toBe('14 phút 36 giây');
    expect(formatDuration(45)).toBe('45 giây');
    expect(formatDuration(3600)).toBe('1 giờ');
    expect(formatDuration(7500)).toBe('2 giờ 5 phút');
    expect(formatDuration(90000)).toBe('1 ngày 1 giờ');
    expect(formatDuration(0)).toBe('0 giây');
  });
});
