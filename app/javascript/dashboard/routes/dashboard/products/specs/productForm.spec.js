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
    ['1000000000', 1000000000],
    ['-1000000001', null],
    ['99999999999', null],
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
    ).toEqual({ name: 'Áo', sku: null, price: 1000, stock: 4 });
  });

  it('validates image_remote_url and drops stock when preorder/custom is selected', () => {
    expect(
      validateForm({
        ...emptyForm(),
        name: 'Phòng',
        price: '1000',
        image_remote_url: 'ftp://invalid',
      })
    ).toEqual({ image_remote_url: 'IMAGE_URL_INVALID' });

    expect(
      buildPayload({
        ...emptyForm(),
        name: 'Phòng Deluxe',
        price: '2.400.000',
        stock: '10',
        availability_mode: 'preorder',
        category: 'Khách sạn',
      })
    ).toEqual({
      name: 'Phòng Deluxe',
      sku: null,
      price: 2400000,
      stock: null,
      availability_mode: 'preorder',
      category: 'Khách sạn',
    });
  });
});
