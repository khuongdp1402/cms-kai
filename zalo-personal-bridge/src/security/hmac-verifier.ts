import crypto from 'crypto';

export interface HmacHeaders {
  keyId: string;
  timestamp: string;
  nonce: string;
  signature: string;
}

export class HmacVerifier {
  static sign(secret: string, keyId: string, timestamp: string, nonce: string, body: string): HmacHeaders {
    const payload = `${timestamp}.${nonce}.${body}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return {
      keyId,
      timestamp,
      nonce,
      signature,
    };
  }

  static verify(
    secret: string,
    signature: string,
    timestampStr: string,
    nonce: string,
    body: string,
    maxSkewSeconds = 60
  ): boolean {
    if (!signature || !timestampStr || !nonce) {
      return false;
    }

    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(timestamp) || Math.abs(now - timestamp) > maxSkewSeconds) {
      return false;
    }

    const payload = `${timestampStr}.${nonce}.${body}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    } catch {
      return false;
    }
  }
}
