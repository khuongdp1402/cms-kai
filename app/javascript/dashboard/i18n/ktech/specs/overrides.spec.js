import en from '../../locale/en';
import overrides from '../index';
import { findOverlayProblems } from './overlayProblems';

describe.each(Object.keys(overrides))('KTech %s overrides', locale => {
  it('has no problems against the English base', () => {
    expect(findOverlayProblems(overrides[locale], en)).toEqual([]);
  });
});

describe('findOverlayProblems', () => {
  const english = { A: { B: 'Hello {name}' } };

  it('accepts a KALO_ key without an English counterpart', () => {
    expect(
      findOverlayProblems({ KALO_NAV: { HOME: 'Trang chủ' } }, english)
    ).toEqual([]);
  });

  it('still rejects a non-KALO key without an English counterpart', () => {
    expect(findOverlayProblems({ OTHER: { X: 'Xin chào' } }, english)).toEqual([
      'OTHER.X: not a known English key',
    ]);
  });

  it('keeps placeholder checks for non-KALO keys', () => {
    expect(findOverlayProblems({ A: { B: 'Xin chào' } }, english)).toEqual([
      'A.B: placeholders differ from English',
    ]);
  });

  it('handles arrays of strings under KALO_ keys without throwing', () => {
    const overlay = { KALO_REPORTS: { WEEKDAYS: ['T2', 'T3', ''] } };
    expect(findOverlayProblems(overlay, english)).toEqual([
      'KALO_REPORTS.WEEKDAYS[2]: not a non-empty string',
    ]);
    expect(
      findOverlayProblems({ KALO_REPORTS: { WEEKDAYS: ['T2', 'T3'] } }, english)
    ).toEqual([]);
  });

  it('flags unbalanced braces in KALO_ strings', () => {
    expect(
      findOverlayProblems({ KALO_X: { Y: 'Xin {name' } }, english)
    ).toEqual(['KALO_X.Y: unbalanced placeholder braces']);
  });
});
