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

// Adds the keys of `source` that `target` does not have, at any depth. Existing values always win.
const fillMissing = (target, source) =>
  Object.entries(source).reduce(
    (merged, [key, value]) => {
      if (!(key in merged)) return { ...merged, [key]: value };
      return isObject(merged[key]) && isObject(value)
        ? { ...merged, [key]: fillMissing(merged[key], value) }
        : merged;
    },
    { ...target }
  );

// Kalo strings are written in Vietnamese only. Every other locale gets them as a
// fallback (any KALO_* key or sub-key it does not define yet), so a user or
// installation that is not on `vi` never sees raw KALO_* keys.
export const applyKaloFallback = (messages, source) => {
  const kalo = Object.fromEntries(
    Object.entries(source).filter(([key]) => key.startsWith('KALO_'))
  );
  return Object.fromEntries(
    Object.entries(messages).map(([locale, localeMessages]) => [
      locale,
      fillMissing(localeMessages, kalo),
    ])
  );
};
