export enum ZcaErrorKind {
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_THREAD = 'INVALID_THREAD',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export class ErrorClassifier {
  static classify(error: any): { kind: ZcaErrorKind; retryable: boolean; message: string } {
    const msg = String(error?.message || error || '').toLowerCase();

    if (
      msg.includes('401') ||
      msg.includes('auth') ||
      msg.includes('session expired') ||
      msg.includes('login required') ||
      msg.includes('zpw_sek') ||
      msg.includes('token expired')
    ) {
      return { kind: ZcaErrorKind.AUTH_EXPIRED, retryable: false, message: 'Authentication expired or invalid session cookie' };
    }

    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
      return { kind: ZcaErrorKind.RATE_LIMITED, retryable: true, message: 'Zalo rate limit hit' };
    }

    if (msg.includes('thread') || msg.includes('not found') || msg.includes('user not found')) {
      return { kind: ZcaErrorKind.INVALID_THREAD, retryable: false, message: 'Target user or group thread is invalid' };
    }

    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('ehostunreach')) {
      return { kind: ZcaErrorKind.NETWORK_ERROR, retryable: true, message: 'Transient network failure connecting to Zalo' };
    }

    return { kind: ZcaErrorKind.UNKNOWN, retryable: false, message: error?.message || 'Unknown provider error' };
  }
}
