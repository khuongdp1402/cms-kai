export class LogRedactor {
  private static sensitiveKeys = new Set([
    'cookie',
    'imei',
    'useragent',
    'password',
    'secret',
    'token',
    'signingsecret',
    'credentials',
    'encryptedcredentials',
    'qrdataurl',
    'qrimage',
    'authorization',
  ]);

  static redact(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redact(item));
    }

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
      if (this.sensitiveKeys.has(normalizedKey)) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = this.redact(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
}
