import en from '../../locale/en';
import vi from '../../locale/vi';
import overrides from '../index';
import { applyLocaleOverrides } from 'shared/helpers/localeOverrides';
import { brandMessages } from 'shared/helpers/brandMessages';
import { flatten } from './overlayProblems';

// Keys whose value is code or belongs to pages out of this phase (login,
// signup, MFA login challenge, year in review).
const EXEMPT = [
  /^INBOX_MGMT\.WIDGET_BUILDER\.SCRIPT_SETTINGS$/,
  /^(LOGIN|REGISTER|RESET_PASSWORD|MFA_VERIFICATION|YEAR_IN_REVIEW|SET_NEW_PASSWORD)\./,
];
const BRAND = /KTech|Chatwoot/i;
// Placeholder names (latestChatwootVersion) are identifiers, not shown text.
const shown = text =>
  text.replace(/\{[^}]*\}/g, '').replace(/https?:\/\/\S+/g, '');
const offenders = messages =>
  Object.entries(flatten(messages))
    .filter(([, text]) => typeof text === 'string' && BRAND.test(shown(text)))
    .map(([key]) => key)
    .filter(key => !EXEMPT.some(rule => rule.test(key)));

describe('product name in Vietnamese UI strings', () => {
  const merged = {
    ...flatten(en),
    ...flatten(applyLocaleOverrides({ vi }, overrides).vi),
  };

  it('the overlay never contains KTech or Chatwoot', () => {
    expect(offenders(overrides.vi)).toEqual([]);
  });

  it('English fallback and Vietnamese strings are rebranded at runtime', () => {
    // Same pipeline as entrypoints/dashboard.js: any leftover "Chatwoot" in an
    // upstream string must come out as the installation name.
    const branded = brandMessages({ vi: merged }, 'Kalo');
    expect(offenders(branded.vi)).toEqual([]);
    expect(
      Object.values(branded.vi).some(text => /Kalo/.test(String(text)))
    ).toBe(true);
  });
});
