import { localCountryName, localCountryOptions } from '../countryNames';

describe('countryNames', () => {
  it('names countries in Vietnamese', () => {
    expect(localCountryName({ id: 'VN', name: 'Vietnam' }, 'vi')).toBe(
      'Việt Nam'
    );
    expect(localCountryName({ id: 'JP', name: 'Japan' }, 'vi')).toBe(
      'Nhật Bản'
    );
  });

  it('falls back to the stored English name', () => {
    expect(localCountryName({ id: '', name: 'Nowhere' }, 'vi')).toBe('Nowhere');
    expect(localCountryName({ id: 'VN', name: 'Vietnam' }, '')).toBe('Vietnam');
  });

  it('builds options sorted in the UI language and keeps the id as value', () => {
    const options = localCountryOptions(
      [
        { id: 'VN', name: 'Vietnam' },
        { id: 'DE', name: 'Germany' },
      ],
      'vi',
      (label, country) => `${label} (${country.id})`
    );
    expect(options).toEqual([
      { value: 'DE', label: 'Đức (DE)' },
      { value: 'VN', label: 'Việt Nam (VN)' },
    ]);
  });
});
