import { describe, it, expect } from 'vitest';
import { Keyring } from '../../src/security/keyring.js';
import { EnvelopeCipher } from '../../src/security/envelope-cipher.js';

describe('EnvelopeCipher', () => {
  const keyring = new Keyring(
    {
      k1: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
    'k1'
  );
  const cipher = new EnvelopeCipher(keyring);

  it('encrypts and decrypts payload correctly with AAD', () => {
    const plaintext = JSON.stringify({ cookie: 'secret_cookie', imei: 'secret_imei' });
    const aad = 'integration_123:1';

    const encrypted = cipher.encrypt(plaintext, aad);
    expect(encrypted.keyId).toBe('k1');
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();

    const decrypted = cipher.decrypt(encrypted, aad);
    expect(decrypted).toBe(plaintext);
  });

  it('fails decryption when AAD does not match', () => {
    const plaintext = 'sensitive_data';
    const encrypted = cipher.encrypt(plaintext, 'aad_1');

    expect(() => {
      cipher.decrypt(encrypted, 'aad_tampered');
    }).toThrow();
  });
});
