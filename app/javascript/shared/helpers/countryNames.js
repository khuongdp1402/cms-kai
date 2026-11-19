// Country names in the UI language (Intl.DisplayNames), e.g. "Việt Nam" for
// VN in Vietnamese. The stored value stays the English name from
// shared/constants/countries.js; only what the shop reads changes.
const displayNamesCache = {};

const displayNamesFor = locale => {
  if (!(locale in displayNamesCache)) {
    try {
      displayNamesCache[locale] = new Intl.DisplayNames([locale], {
        type: 'region',
      });
    } catch {
      displayNamesCache[locale] = null;
    }
  }
  return displayNamesCache[locale];
};

export const localCountryName = ({ id, name }, locale) => {
  if (!id || !locale) return name;
  try {
    const localName = displayNamesFor(locale)?.of(id);
    return localName && localName !== id ? localName : name;
  } catch {
    return name;
  }
};

// Countries as select options, labelled and sorted in the UI language.
export const localCountryOptions = (countries, locale, format = name => name) =>
  countries
    .map(country => ({
      value: country.id,
      label: format(localCountryName(country, locale), country),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
