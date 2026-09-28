import { describe, it, expect } from 'vitest';
import { HmacVerifier } from '../../src/security/hmac-verifier.js';

describe('HmacVerifier', () => {
  const secret = 'super_secret_bridge_key_1234567890';

  it('signs and verifies HMAC successfully', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 'random_nonce_123';
    const body = JSON.stringify({ hello: 'world' });

    const headers = HmacVerifier.sign(secret, 'k1', timestamp, nonce, body);
    expect(headers.signature).toBeDefined();

    const isValid = HmacVerifier.verify(
      secret,
      headers.signature,
      timestamp,
      nonce,
      body,
      60
    );
    expect(isValid).toBe(true);
  });

  it('rejects tampered body', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 'random_nonce_123';
    const body = JSON.stringify({ hello: 'world' });

    const headers = HmacVerifier.sign(secret, 'k1', timestamp, nonce, body);

    const isValid = HmacVerifier.verify(
      secret,
      headers.signature,
      timestamp,
      nonce,
      JSON.stringify({ hello: 'tampered' }),
      60
    );
    expect(isValid).toBe(false);
  });

  it('rejects expired timestamp', () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 120).toString();
    const nonce = 'random_nonce_123';
    const body = JSON.stringify({ hello: 'world' });

    const headers = HmacVerifier.sign(secret, 'k1', oldTimestamp, nonce, body);

    const isValid = HmacVerifier.verify(
      secret,
      headers.signature,
      oldTimestamp,
      nonce,
      body,
      60
    );
    expect(isValid).toBe(false);
  });
});
