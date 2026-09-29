import { brandMessages, installationBrandName } from '../brandMessages';

describe('brandMessages', () => {
  it('replaces Chatwoot in nested strings, any casing', () => {
    const messages = {
      en: {
        A: 'Welcome to Chatwoot',
        B: { C: 'CHATWOOT rocks', D: ['chatwoot'] },
      },
    };
    expect(brandMessages(messages, 'KTech')).toEqual({
      en: { A: 'Welcome to KTech', B: { C: 'KTech rocks', D: ['KTech'] } },
    });
  });

  it('keeps placeholders, linked keys and URLs intact', () => {
    const messages = {
      A: 'Update Chatwoot to {latestChatwootVersion}',
      B: '@:SETTINGS.CHATWOOT_TITLE',
      C: 'Docs: https://www.chatwoot.com/docs for Chatwoot',
      D: '@.lower:CHATWOOT.NAME and Chatwoot',
    };
    expect(brandMessages(messages, 'KTech')).toEqual({
      A: 'Update KTech to {latestChatwootVersion}',
      B: '@:SETTINGS.CHATWOOT_TITLE',
      C: 'Docs: https://www.chatwoot.com/docs for KTech',
      D: '@.lower:CHATWOOT.NAME and KTech',
    });
  });

  it('leaves non-string values and missing brand untouched', () => {
    const messages = { A: 1, B: null, C: 'Chatwoot' };
    expect(brandMessages(messages, 'KTech')).toEqual({
      A: 1,
      B: null,
      C: 'KTech',
    });
    expect(brandMessages(messages, undefined)).toBe(messages);
    expect(brandMessages(messages, '')).toBe(messages);
  });

  it('does not mutate the input', () => {
    const messages = { A: 'Chatwoot' };
    brandMessages(messages, 'KTech');
    expect(messages.A).toBe('Chatwoot');
  });
});

describe('installationBrandName', () => {
  afterEach(() => {
    delete window.globalConfig;
  });

  it('reads INSTALLATION_NAME from window.globalConfig', () => {
    window.globalConfig = { INSTALLATION_NAME: 'KTech' };
    expect(installationBrandName()).toBe('KTech');
  });

  it('returns undefined without globalConfig', () => {
    expect(installationBrandName()).toBeUndefined();
  });
});
