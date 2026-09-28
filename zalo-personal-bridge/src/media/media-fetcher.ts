import fs from 'fs/promises';
import { URL } from 'url';
import { fetch } from 'undici';
import { SafeUrlChecker } from '../security/safe-url.js';
import { MediaValidator } from './media-validator.js';
import { LIMITS } from '../config/limits.js';
import { config } from '../config/env.js';
import { logger } from '../telemetry/logger.js';

export class MediaFetcher {
  /**
   * Rewrite a Chatwoot external (FRONTEND_URL-based) attachment URL to the
   * internal cluster service URL so the bridge can download it directly
   * without going through external DNS / ingress / TLS.
   *
   * Example:
   *   external: https://cms-kai.example.com/rails/active_storage/blobs/xxx
   *   internal: http://cms-kai:3000/rails/active_storage/blobs/xxx
   */
  static rewriteToInternalUrl(downloadUrl: string): string {
    if (!config.frontendUrl || !config.chatwootBaseUrl) {
      return downloadUrl;
    }

    try {
      const parsed = new URL(downloadUrl);
      const frontend = new URL(config.frontendUrl);

      // Only rewrite if the download URL belongs to the external Chatwoot host
      if (parsed.hostname !== frontend.hostname) {
        return downloadUrl;
      }

      const internal = new URL(config.chatwootBaseUrl);
      parsed.protocol = internal.protocol;
      parsed.hostname = internal.hostname;
      parsed.port = internal.port;
      return parsed.toString();
    } catch {
      // URL parsing failed — return as-is
      return downloadUrl;
    }
  }

  static async fetchToLocalPath(
    downloadUrl: string,
    targetPath: string,
    expectedMimeType?: string
  ): Promise<{ path: string; mime: string; bytes: number }> {
    // 1. Rewrite external URL → internal URL when applicable
    const effectiveUrl = this.rewriteToInternalUrl(downloadUrl);

    if (effectiveUrl !== downloadUrl) {
      logger.info(
        { original: downloadUrl, rewritten: effectiveUrl },
        'Rewrote attachment download URL to internal service URL'
      );
    }

    // 2. SSRF check
    await SafeUrlChecker.assertSafeUrl(effectiveUrl);

    // 3. Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LIMITS.MEDIA_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(effectiveUrl, {
        signal: controller.signal,
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`Failed to download media: HTTP ${response.status} from ${effectiveUrl}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > LIMITS.MAX_FILE_SIZE_BYTES) {
        throw new Error(`Media size ${buffer.length} exceeds maximum limit of 50MB`);
      }

      // 4. Validate MIME
      const validation = await MediaValidator.validate(buffer, expectedMimeType);
      if (!validation.valid) {
        throw new Error(`MIME validation failed. Expected: ${expectedMimeType}, detected: ${validation.detectedMime}`);
      }

      await fs.writeFile(targetPath, buffer);

      return {
        path: targetPath,
        mime: validation.detectedMime || expectedMimeType || 'application/octet-stream',
        bytes: buffer.length,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
