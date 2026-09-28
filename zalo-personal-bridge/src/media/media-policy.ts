import { LIMITS } from '../config/limits.js';
import { OutboundAttachment } from '../contracts/outbound-command-v1.js';

export class MediaPolicy {
  static validateOutboundAttachments(attachments: OutboundAttachment[]): void {
    if (attachments.length > LIMITS.MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new Error(`Too many attachments. Maximum allowed is ${LIMITS.MAX_ATTACHMENTS_PER_MESSAGE}.`);
    }

    let totalBytes = 0;
    for (const att of attachments) {
      const byteSize = att.byte_size || 0;
      totalBytes += byteSize;

      if (att.type === 'image' && byteSize > LIMITS.MAX_IMAGE_SIZE_BYTES) {
        throw new Error(`Image attachment ${att.filename || ''} exceeds maximum limit of 10MB.`);
      }
      if (att.type === 'audio' && byteSize > LIMITS.MAX_AUDIO_SIZE_BYTES) {
        throw new Error(`Audio attachment ${att.filename || ''} exceeds maximum limit of 20MB.`);
      }
      if (byteSize > LIMITS.MAX_FILE_SIZE_BYTES) {
        throw new Error(`Attachment ${att.filename || ''} exceeds maximum limit of 50MB.`);
      }
    }

    if (totalBytes > LIMITS.MAX_MESSAGE_TOTAL_BYTES) {
      throw new Error(`Total message attachments size exceeds 50MB limit.`);
    }
  }
}
