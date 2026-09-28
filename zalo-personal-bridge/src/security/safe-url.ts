import dns from 'dns/promises';
import { URL } from 'url';

export class SafeUrlChecker {
  static isPrivateIp(ip: string): boolean {
    // IPv4 checks
    if (ip.startsWith('127.')) return true; // Loopback
    if (ip.startsWith('10.')) return true;  // Private 10/8
    if (ip.startsWith('192.168.')) return true; // Private 192.168/16
    if (ip.startsWith('169.254.')) return true; // Link-local / Cloud metadata (169.254.169.254)
    if (ip === '0.0.0.0' || ip === '255.255.255.255') return true;

    if (ip.startsWith('172.')) {
      const parts = ip.split('.');
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true; // Private 172.16/12
    }

    // IPv6 checks
    if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
      return true;
    }

    return false;
  }

  /**
   * Check whether a hostname belongs to a trusted internal Chatwoot service.
   * The bridge and Rails run in the same K8s cluster, so the internal service
   * hostname (derived from CHATWOOT_WEBHOOK_URL / CHATWOOT_BASE_URL) is safe
   * to access even when it resolves to a private/cluster IP.
   */
  static isTrustedChatwootUrl(hostname: string): boolean {
    const trustedSources = [
      process.env.CHATWOOT_BASE_URL,
      process.env.CHATWOOT_WEBHOOK_URL,
    ].filter(Boolean) as string[];

    for (const source of trustedSources) {
      try {
        const parsed = new URL(source);
        if (parsed.hostname === hostname) return true;
      } catch { /* skip unparseable values */ }
    }

    return false;
  }

  static async assertSafeUrl(urlString: string): Promise<URL> {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Forbidden protocol: ${parsed.protocol}`);
    }

    // Allow dev container or docker hostnames if environment allows
    if (process.env.NODE_ENV !== 'production' && (parsed.hostname === 'localhost' || parsed.hostname === 'rails' || parsed.hostname === '127.0.0.1')) {
      return parsed;
    }

    // Allow internal Chatwoot service URLs (bridge ↔ rails in the same cluster)
    if (this.isTrustedChatwootUrl(parsed.hostname)) {
      return parsed;
    }

    try {
      const lookup = await dns.lookup(parsed.hostname, { all: true });
      for (const entry of lookup) {
        if (this.isPrivateIp(entry.address)) {
          throw new Error(`SSRF guard blocked access to private/internal IP address: ${entry.address}`);
        }
      }
    } catch (err: any) {
      if (err.message.includes('SSRF guard')) throw err;
      throw new Error(`DNS resolution failed for host ${parsed.hostname}: ${err.message}`);
    }

    return parsed;
  }
}
