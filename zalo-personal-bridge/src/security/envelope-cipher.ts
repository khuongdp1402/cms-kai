import crypto from 'crypto';
import { Keyring } from './keyring.js';

export interface EncryptedPayload {
  keyId: string;
  iv: string;      // base64
  tag: string;     // base64
  ciphertext: string; // base64
}

export class EnvelopeCipher {
  constructor(private keyring: Keyring) {}

  encrypt(plaintext: string, aad: string): EncryptedPayload {
    const keyId = this.keyring.getActiveKeyId();
    const key = this.keyring.getKey(keyId);
    if (!key) {
      throw new Error(`Encryption key not found for ID: ${keyId}`);
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    if (aad) {
      cipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      keyId,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: encrypted.toString('base64'),
    };
  }

  decrypt(payload: EncryptedPayload, aad: string): string {
    const key = this.keyring.getKey(payload.keyId);
    if (!key) {
      throw new Error(`Decryption key not found for ID: ${payload.keyId}`);
    }

    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    if (aad) {
      decipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
