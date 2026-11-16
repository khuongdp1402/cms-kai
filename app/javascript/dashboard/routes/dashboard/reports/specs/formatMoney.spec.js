import { formatMoney } from '../formatMoney';

describe('formatMoney', () => {
  it('formats whole VND with dot separators', () => {
    expect(formatMoney(403000)).toBe('403.000đ');
    expect(formatMoney(6821000)).toBe('6.821.000đ');
    expect(formatMoney(0)).toBe('0đ');
    expect(formatMoney(950)).toBe('950đ');
  });

  it('never renders NaN and keeps the sign of negative amounts', () => {
    expect(formatMoney(-403000)).toBe('-403.000đ');
    expect(formatMoney(NaN)).toBe('0đ');
    expect(formatMoney(undefined)).toBe('0đ');
    expect(formatMoney('403000')).toBe('403.000đ');
  });
});
