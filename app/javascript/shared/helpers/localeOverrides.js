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
