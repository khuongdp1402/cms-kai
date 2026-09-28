import { fileTypeFromBuffer } from 'file-type';

export class MediaValidator {
  static async validate(buffer: Buffer, declaredMimeType?: string): Promise<{ valid: boolean; detectedMime?: string; ext?: string }> {
    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType) {
      // If undetectable (e.g. plain text or csv), allow if declared
      return { valid: true, detectedMime: declaredMimeType || 'application/octet-stream' };
    }

    if (declaredMimeType && !declaredMimeType.includes('octet-stream')) {
      const isMatch = fileType.mime === declaredMimeType || declaredMimeType.startsWith(fileType.mime.split('/')[0]);
      return {
        valid: isMatch,
        detectedMime: fileType.mime,
        ext: fileType.ext,
      };
    }

    return {
      valid: true,
      detectedMime: fileType.mime,
      ext: fileType.ext,
    };
  }
}
