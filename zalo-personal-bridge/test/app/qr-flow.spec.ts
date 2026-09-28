import { beforeEach, describe, expect, it, vi } from 'vitest';

const testDoubles = vi.hoisted(() => ({
  loginQR: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('zca-js', () => ({
  Zalo: class {
    loginQR(...args: unknown[]) {
      return testDoubles.loginQR(...args);
    }
  },
}));

vi.mock('../../src/telemetry/logger.js', () => ({
  logger: {
    error: testDoubles.loggerError,
    warn: testDoubles.loggerWarn,
  },
}));

import { buildApp } from '../../src/app.js';
import { HmacVerifier } from '../../src/security/hmac-verifier.js';

const SERVICE_SECRET = 'qr-flow-test-secret';

function signedHeaders(body = ''): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const headers = HmacVerifier.sign(
    SERVICE_SECRET,
    'test-key',
    timestamp,
    `nonce-${Math.random()}`,
    body
  );

  return {
    'x-zalo-personal-key-id': headers.keyId,
    'x-zalo-personal-timestamp': headers.timestamp,
    'x-zalo-personal-nonce': headers.nonce,
    'x-zalo-personal-signature': headers.signature,
  };
}

function createTestApp() {
  return buildApp(
    { query: vi.fn() } as any,
    {} as any,
    {} as any,
    SERVICE_SECRET
  );
}

describe('Zalo QR flow runtime diagnostics', () => {
  beforeEach(() => {
    testDoubles.loginQR.mockReset();
    testDoubles.loggerError.mockReset();
    testDoubles.loggerWarn.mockReset();
  });

  it('uses a Chrome 130 Windows user agent that matches the provider client hints', async () => {
    testDoubles.loginQR.mockImplementation((_options, callback) => {
      callback({ type: 0, data: { image: 'safe-qr-image' } });
      return new Promise(() => {});
    });

    const app = createTestApp();
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/internal/v1/integrations/integration-fingerprint/qr-flows',
        headers: signedHeaders(),
      });

      expect(response.statusCode).toBe(201);
      expect(testDoubles.loginQR).toHaveBeenCalledWith(
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        },
        expect.any(Function)
      );
    } finally {
      await app.close();
    }
  });

  it('reports awaiting_confirmation after the QR code is scanned', async () => {
    testDoubles.loginQR.mockImplementation((_options, callback) => {
      callback({ type: 0, data: { image: 'safe-qr-image' } });
      callback({
        type: 2,
        data: { display_name: 'Test User', avatar: 'https://example.test/avatar.png' },
      });
      return new Promise(() => {});
    });

    const app = createTestApp();
    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/internal/v1/integrations/integration-1/qr-flows',
        headers: signedHeaders(),
      });
      const created = createResponse.json();

      expect(createResponse.statusCode).toBe(201);
      expect(created.status).toBe('awaiting_confirmation');
      expect(created.error_code).toBeNull();

      const statusResponse = await app.inject({
        method: 'GET',
        url: `/internal/v1/integrations/integration-1/qr-flows/${created.flow_id}`,
        headers: signedHeaders(),
      });

      expect(statusResponse.json()).toMatchObject({
        status: 'awaiting_confirmation',
        error_code: null,
      });
    } finally {
      await app.close();
    }
  });

  it('returns zalo_login_incomplete when login resolves without all session fields', async () => {
    let resolveLogin!: (value: unknown) => void;
    testDoubles.loginQR.mockImplementation((_options, callback) => {
      callback({ type: 0, data: { image: 'safe-qr-image' } });
      return new Promise((resolve) => {
        resolveLogin = resolve;
      });
    });

    const app = createTestApp();
    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/internal/v1/integrations/integration-2/qr-flows',
        headers: signedHeaders(),
      });
      const created = createResponse.json();

      expect(created).toHaveProperty('error_code', null);
      resolveLogin({ getOwnId: () => 'zalo-user-2' });
      await vi.waitFor(() => expect(testDoubles.loggerWarn).toHaveBeenCalledOnce());

      const statusResponse = await app.inject({
        method: 'GET',
        url: `/internal/v1/integrations/integration-2/qr-flows/${created.flow_id}`,
        headers: signedHeaders(),
      });

      expect(statusResponse.json()).toMatchObject({
        status: 'failed',
        error_code: 'zalo_login_incomplete',
      });
      expect(testDoubles.loggerWarn.mock.calls[0][0]).toMatchObject({
        flow_id: created.flow_id,
        phase: 'login_resolution',
        status: 'failed',
        error_code: 'zalo_login_incomplete',
        error_class: 'ZaloLoginIncompleteError',
      });
    } finally {
      await app.close();
    }
  });

  it('returns zalo_login_failed immediately when loginQR throws', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-24T00:00:00.000Z') });
    testDoubles.loginQR.mockImplementation(() => {
      throw new Error('Cannot initialize provider login');
    });

    const app = createTestApp();
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/internal/v1/integrations/integration-3/qr-flows',
        headers: signedHeaders(),
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        status: 'failed',
        error_code: 'zalo_login_failed',
      });
      expect(testDoubles.loggerError.mock.calls[0][0]).toMatchObject({
        phase: 'login_start',
        status: 'failed',
        error_class: 'Error',
        error_message: 'Cannot initialize provider login',
      });

      await vi.advanceTimersByTimeAsync(100_001);
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/internal/v1/integrations/integration-3/qr-flows/${response.json().flow_id}`,
        headers: signedHeaders(),
      });
      expect(statusResponse.json()).toMatchObject({
        status: 'failed',
        error_code: 'zalo_login_failed',
      });
    } finally {
      await app.close();
      vi.useRealTimers();
    }
  });

  it('logs rejected loginQR promises without exposing credentials or QR data', async () => {
    const providerError = new Error(
      'cookie=zpw_sek-secret credentials=private qrDataUrl=data:image/png;base64,private'
    );
    providerError.name = 'ProviderLoginError';
    testDoubles.loginQR.mockImplementation((_options, callback) => {
      callback({ type: 0, data: { image: 'safe-qr-image' } });
      return Promise.reject(providerError);
    });

    const app = createTestApp();
    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/internal/v1/integrations/integration-4/qr-flows',
        headers: signedHeaders(),
      });
      const created = createResponse.json();
      await vi.waitFor(() => expect(testDoubles.loggerError).toHaveBeenCalledOnce());

      const statusResponse = await app.inject({
        method: 'GET',
        url: `/internal/v1/integrations/integration-4/qr-flows/${created.flow_id}`,
        headers: signedHeaders(),
      });

      expect(statusResponse.json()).toMatchObject({
        status: 'failed',
        error_code: 'zalo_login_failed',
      });

      const logContext = testDoubles.loggerError.mock.calls[0][0];
      expect(logContext).toMatchObject({
        flow_id: created.flow_id,
        phase: 'login_promise',
        status: 'failed',
        error_code: 'zalo_login_failed',
        error_class: 'ProviderLoginError',
        error_message: 'Provider error details redacted',
      });
      expect(JSON.stringify(logContext)).not.toContain('zpw_sek-secret');
      expect(JSON.stringify(logContext)).not.toContain('data:image/png');
    } finally {
      await app.close();
    }
  });
});
