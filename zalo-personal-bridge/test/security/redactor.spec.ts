import { describe, it, expect } from 'vitest';
import { LogRedactor } from '../../src/security/redactor.js';

describe('LogRedactor', () => {
  it('redacts sensitive fields recursively', () => {
    const input = {
      username: 'agent1',
      cookie: 'zpw_sek=123456',
      nested: {
        token: 'secret_token_val',
        publicField: 'visible',
      },
    };

    const redacted = LogRedactor.redact(input);
    expect(redacted.username).toBe('agent1');
    expect(redacted.cookie).toBe('[REDACTED]');
    expect(redacted.nested.token).toBe('[REDACTED]');
    expect(redacted.nested.publicField).toBe('visible');
  });
});
