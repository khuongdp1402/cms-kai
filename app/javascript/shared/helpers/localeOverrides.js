const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (base, override) =>
  Object.entries(override).reduce(
    (merged, [key, value]) => ({
      ...merged,
      [key]:
        isObject(value) && isObject(base[key])
          ? deepMerge(base[key], value)
          : value,
    }),
    { ...base }
  );

// Layers KTech translations over the upstream locale files without editing
// them, so Crowdin updates from upstream still merge cleanly (ADR-007).
export const applyLocaleOverrides = (messages, overrides) =>
  Object.entries(overrides).reduce(
    (result, [locale, localeOverrides]) =>
      messages[locale]
        ? { ...result, [locale]: deepMerge(messages[locale], localeOverrides) }
        : result,
    { ...messages }
  );

// Kalo strings are written in Vietnamese only. Every other locale gets them as
// a fallback (top-level KALO_* namespaces it does not define yet), so a user or
// installation that is not on `vi` never sees raw KALO_* keys.
export const applyKaloFallback = (messages, source) => {
  const kaloKeys = Object.keys(source).filter(key => key.startsWith('KALO_'));
  return Object.fromEntries(
    Object.entries(messages).map(([locale, localeMessages]) => [
      locale,
      kaloKeys.reduce(
        (merged, key) =>
          key in merged ? merged : { ...merged, [key]: source[key] },
        localeMessages
      ),
    ])
  );
};
