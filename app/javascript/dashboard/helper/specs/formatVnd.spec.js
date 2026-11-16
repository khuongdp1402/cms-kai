import { formatVnd } from '../formatVnd';

describe('formatVnd', () => {
  it('uses dots as thousand separators and the đ suffix', () => {
    expect(formatVnd(403000)).toBe('403.000đ');
    expect(formatVnd(4990000)).toBe('4.990.000đ');
  });

  it('handles zero and small amounts', () => {
    expect(formatVnd(0)).toBe('0đ');
    expect(formatVnd(950)).toBe('950đ');
  });

  it('treats missing values as zero', () => {
    expect(formatVnd(null)).toBe('0đ');
  });
});
