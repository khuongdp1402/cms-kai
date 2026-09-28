export class Keyring {
  private keys: Map<string, Buffer> = new Map();
  private activeKeyId: string;

  constructor(keysConfig: Record<string, string>, activeKeyId: string) {
    this.activeKeyId = activeKeyId;
    for (const [keyId, hexOrBase64] of Object.entries(keysConfig)) {
      // Key can be 64-character hex string (32 bytes) or 32-character utf8/base64
      let keyBuffer: Buffer;
      if (hexOrBase64.length === 64 && /^[0-9a-fA-F]+$/.test(hexOrBase64)) {
        keyBuffer = Buffer.from(hexOrBase64, 'hex');
      } else {
        keyBuffer = Buffer.from(hexOrBase64, 'utf8');
        if (keyBuffer.length < 32) {
          keyBuffer = Buffer.concat([keyBuffer, Buffer.alloc(32 - keyBuffer.length)]);
        } else if (keyBuffer.length > 32) {
          keyBuffer = keyBuffer.subarray(0, 32);
        }
      }
      this.keys.set(keyId, keyBuffer);
    }

    if (!this.keys.has(activeKeyId)) {
      throw new Error(`Active encryption key ID '${activeKeyId}' is missing from keyring config.`);
    }
  }

  getActiveKeyId(): string {
    return this.activeKeyId;
  }

  getKey(keyId: string): Buffer | undefined {
    return this.keys.get(keyId);
  }
}
