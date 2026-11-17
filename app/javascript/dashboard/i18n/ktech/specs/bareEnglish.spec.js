// Guard: Kalo-owned and settings templates must not carry bare English text.
// Visible text has to come from i18n (Vietnamese overlay), see LESSONS and
// docs/reference/dev-setup.md. Heuristic, not a parser: it strips tags and
// `{{ }}` expressions, skips text with Vietnamese letters, and flags what is
// left when it reads as English (two words or a known UI word).
const allSources = import.meta.glob(
  [
    '/app/javascript/dashboard/components-next/sidebar/Kalo*.vue',
    '/app/javascript/dashboard/routes/dashboard/{orders,pos,reports,marketing,settings,console}/**/*.vue',
    '/app/javascript/dashboard/components/widgets/conversation/Kalo*.vue',
    '/app/javascript/dashboard/routes/dashboard/conversation/**/Kalo*.vue',
  ],
  { query: '?raw', import: 'default', eager: true }
);

// Histoire stories are dev-only showcases, not user screens.
const sources = Object.fromEntries(
  Object.entries(allSources).filter(([path]) => !path.endsWith('.story.vue'))
);

const VIETNAMESE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const UI_WORDS =
  /\b(the|and|your|you|to|for|with|please|click|select|enter|add|create|delete|save|cancel|search|new|edit|remove|settings|loading|error|failed|success|sign|upload|choose|file|not|no|yes|all|from|back|show|hide|open|close|copy|import)\b/i;
const TEXT_ATTRIBUTES =
  /\s(?:placeholder|title|label|aria-label|alt|tooltip|description|header)="([^"]*)"/g;
// Third-party UI labels that instructions must quote verbatim.
const ALLOWED = ['Export Cookies'];

export const looksLikeBareEnglish = text => {
  const value = text.trim();
  if (!value || VIETNAMESE.test(value) || ALLOWED.includes(value)) return false;
  return (
    UI_WORDS.test(value) &&
    /[A-Za-z]{2,}\s+[A-Za-z]{2,}|^[A-Z][a-z]+$/.test(value)
  );
};

export const findBareEnglish = vueSource => {
  const template = vueSource.match(/<template[^>]*>([\s\S]*)<\/template>/);
  if (!template) return [];
  const html = template[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{[\s\S]*?\}\}/g, ' ');
  const attributes = [...html.matchAll(TEXT_ATTRIBUTES)].map(m => m[1]);
  const nodes = html
    .replace(/<(?:"[^"]*"|'[^']*'|[^>"'])*>/g, '\u0001')
    .split('\u0001');
  return [...attributes, ...nodes]
    .filter(looksLikeBareEnglish)
    .map(text => text.trim().slice(0, 60));
};

describe('findBareEnglish', () => {
  it('flags English text and attributes', () => {
    expect(
      findBareEnglish('<template><p>Please select a file</p></template>')
    ).toEqual(['Please select a file']);
    expect(
      findBareEnglish('<template><a placeholder="Search orders" /></template>')
    ).toEqual(['Search orders']);
  });

  it('ignores Vietnamese text, i18n expressions and brand names', () => {
    expect(
      findBareEnglish(
        `<template><p>Chọn file để tải lên</p><b>{{ t('A.B') }}</b><i>Zalo OA</i><a v-if="a > 1">Xong</a></template>`
      )
    ).toEqual([]);
  });
});

describe('Kalo and settings templates', () => {
  it('scans a meaningful number of files', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
  });

  it.each(Object.entries(sources))(
    '%s has no bare English text',
    (_, source) => {
      expect(findBareEnglish(source)).toEqual([]);
    }
  );
});
