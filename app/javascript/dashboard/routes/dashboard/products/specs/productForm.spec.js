import {
  buildPayload,
  emptyForm,
  parseDelta,
  parseVnd,
  validateForm,
} from '../productForm';

describe('productForm helpers', () => {
  it.each([
    ['150000', 150000],
    ['150.000', 150000],
    ['150 000', 150000],
    ['1,500,000', 1500000],
    ['0', 0],
    ['', null],
    ['-1', null],
    ['12.5k', null],
  ])('parseVnd(%s) = %s', (input, expected) => {
    expect(parseVnd(input)).toBe(expected);
  });

  it.each([
    ['+5', 5],
    ['-2', -2],
    ['3', 3],
    ['0', null],
    ['1.5', null],
    ['', null],
  ])('parseDelta(%s) = %s', (input, expected) => {
    expect(parseDelta(input)).toBe(expected);
  });

  it('accepts a blank stock and rejects an oversized image', () => {
    const form = { ...emptyForm(), name: 'Áo', price: '0' };
    expect(validateForm(form)).toEqual({});
    const big = { type: 'image/png', size: 5 * 1024 * 1024 + 1 };
    expect(validateForm({ ...form, image: big })).toEqual({
      image: 'IMAGE_SIZE',
    });
  });

  it('builds JSON without an image', () => {
    expect(
      buildPayload({ ...emptyForm(), name: 'Áo', price: '1.000', stock: '4' })
    ).toEqual({ name: 'Áo', sku: '', price: 1000, stock: 4 });
  });
});
