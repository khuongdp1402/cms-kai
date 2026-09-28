import { describe, it, expect } from 'vitest';
import { MediaPolicy } from '../../src/media/media-policy.js';

describe('MediaPolicy', () => {
  it('validates outbound attachments within limits', () => {
    const attachments = [
      {
        chatwoot_attachment_id: 1,
        type: 'image' as const,
        download_url: 'http://localhost/test.jpg',
        byte_size: 2 * 1024 * 1024,
      },
    ];

    expect(() => {
      MediaPolicy.validateOutboundAttachments(attachments);
    }).not.toThrow();
  });

  it('throws error when image exceeds 10MB', () => {
    const attachments = [
      {
        chatwoot_attachment_id: 1,
        type: 'image' as const,
        download_url: 'http://localhost/large.jpg',
        byte_size: 15 * 1024 * 1024,
      },
    ];

    expect(() => {
      MediaPolicy.validateOutboundAttachments(attachments);
    }).toThrow(/exceeds maximum limit of 10MB/);
  });

  it('throws error when attachments count exceeds 5', () => {
    const attachments = Array.from({ length: 6 }, (_, i) => ({
      chatwoot_attachment_id: i,
      type: 'image' as const,
      download_url: `http://localhost/img_${i}.jpg`,
      byte_size: 1024,
    }));

    expect(() => {
      MediaPolicy.validateOutboundAttachments(attachments);
    }).toThrow(/Maximum allowed is 5/);
  });
});
