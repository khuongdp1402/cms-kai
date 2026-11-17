// Pure checks for a KTech overlay against the English base locale.
// Top-level namespaces starting with KALO_ are Vietnamese-original (no English
// counterpart); every other key must override a real Chatwoot key.
const KALO_PREFIX = 'KALO_';

const isPlainObject = value =>
  value && typeof value === 'object' && !Array.isArray(value);

export const flatten = (obj, prefix = '', out = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      flatten(value, full, out);
    } else {
      out[full] = value;
    }
  });
  return out;
};

export const tokens = text =>
  (text.match(/\{[^}]*\}|@(?:\.\w+)?:[\w.]+/g) || []).sort();

const isKalo = key => key.startsWith(KALO_PREFIX);

const balanced = text => {
  let depth = 0;
  return (
    [...text].every(ch => {
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      return depth >= 0 && depth <= 1;
    }) && depth === 0
  );
};

// Expands array leaves of KALO_ keys into `key[i]` string entries.
const expandKaloArrays = flat =>
  Object.entries(flat).flatMap(([key, value]) =>
    isKalo(key) && Array.isArray(value)
      ? value.map((item, i) => [`${key}[${i}]`, item])
      : [[key, value]]
  );

export const findOverlayProblems = (overlay, english) => {
  const englishFlat = flatten(english);
  const problems = [];
  expandKaloArrays(flatten(overlay)).forEach(([key, text]) => {
    const add = problem => problems.push(`${key}: ${problem}`);
    const kalo = isKalo(key);
    if (!kalo && !(key in englishFlat)) add('not a known English key');
    if (typeof text !== 'string' || text.trim() === '') {
      add('not a non-empty string');
      return;
    }
    // Placeholder names are code identifiers, not shown text.
    if (/KTech|Chatwoot/i.test(text.replace(/\{[^}]*\}/g, '')))
      add('visible KTech or Chatwoot name');
    if (kalo) {
      if (!balanced(text)) add('unbalanced placeholder braces');
    } else if (
      typeof englishFlat[key] === 'string' &&
      tokens(text).join('\u0000') !== tokens(englishFlat[key]).join('\u0000')
    ) {
      add('placeholders differ from English');
    }
  });
  return problems;
};
