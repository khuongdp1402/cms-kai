import { formatDateRange, relativeTime, setDateLocale } from '../dateLocale';

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
});
