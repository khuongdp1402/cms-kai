import { InboundEventV1, InboundEventTypeEnum } from '../../contracts/inbound-event-v1.js';

export class EventNormalizer {
  static normalize(
    rawMessage: any,
    integrationId: string,
    sessionGeneration: number,
    sequence: number,
    groupMeta?: { name?: string; avatar_url?: string }
  ): InboundEventV1 | null {
    if (!rawMessage) return null;

    const occurredAt = new Date().toISOString();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Self message or echo
    const isSelf = !!rawMessage.isSelf;

    // Direct vs Group detection
    const isGroup = rawMessage.type === 1 || rawMessage.isGroup || (rawMessage.threadId && rawMessage.data?.uidFrom && rawMessage.threadId !== rawMessage.data?.uidFrom);
    const threadId = String(rawMessage.threadId || rawMessage.data?.fromId || rawMessage.data?.uidFrom || '');
    if (!threadId) return null;

    const senderId = String(rawMessage.data?.uidFrom || rawMessage.data?.fromId || threadId);
    const senderName = rawMessage.data?.displayName || rawMessage.data?.dName || rawMessage.data?.name || (isGroup ? `Thành viên ${senderId.slice(-4)}` : 'Người dùng Zalo');

    // Parse content & attachments
    const rawContent = rawMessage.data?.content || rawMessage.data?.msg || rawMessage.data?.message || (typeof rawMessage.data === 'string' ? rawMessage.data : null);

    let text: string | null = null;
    const attachments: any[] = [];

    if (typeof rawContent === 'string') {
      text = rawContent;
    } else if (typeof rawContent === 'object' && rawContent !== null) {
      if (rawContent.href || rawContent.thumb || rawContent.url) {
        attachments.push(this.buildImageAttachment(rawContent.href || rawContent.url || rawContent.thumb));
      }
      text = rawContent.title || rawContent.description || null;
    }

    // Extract attachment URLs from all known Zalo message fields.
    // Zalo sends media references in various data properties depending on
    // message type (photo, HD photo, video, file share, sticker, etc.).
    // Priority for images: hdUrl > oriUrl > normalUrl > href > url > thumb
    const d = rawMessage.data || {};

    const bestImageUrl = this.pickBestImageUrl(d);
    if (bestImageUrl && !attachments.some(a => a.url === bestImageUrl)) {
      attachments.push(this.buildImageAttachment(bestImageUrl));
    }

    // href — common image field (ensure not duplicated)
    if (d.href && !attachments.some((a: any) => a.url === d.href)) {
      attachments.push(this.buildImageAttachment(d.href));
    }

    // fileUrl — file shares
    if (d.fileUrl && !attachments.some((a: any) => a.url === d.fileUrl)) {
      attachments.push({
        type: d.fileSize ? 'file' : 'image',
        media_ref: d.fileUrl,
        url: d.fileUrl,
        filename: d.fileName || undefined,
      });
    }

    const providerMessageId = String(rawMessage.data?.msgId || rawMessage.msgId || rawMessage.data?.id || eventId);

    const type: InboundEventTypeEnum = 'message.created';

    return {
      version: 1,
      event_id: eventId,
      integration_id: integrationId,
      type,
      sequence,
      occurred_at: occurredAt,
      session_generation: sessionGeneration,
      data: {
        thread: {
          id: threadId,
          type: isGroup ? 'group' : 'direct',
          name: groupMeta?.name || rawMessage.data?.groupName || rawMessage.data?.gName || undefined,
          avatar_url: groupMeta?.avatar_url || rawMessage.data?.groupAvatar || undefined,
        },
        sender: {
          id: senderId,
          name: senderName,
          avatar_url: rawMessage.data?.avatar || null,
        },
        message: {
          id: providerMessageId,
          direction: isSelf ? 'outgoing' : 'incoming',
          text,
          reply_to_id: rawMessage.data?.quote?.msgId || null,
          mentions: rawMessage.data?.mentions || [],
          attachments,
        },
      },
    };
  }

  /**
   * Select the highest-quality image URL from a Zalo message data object.
   * zca-js / Zalo uses several fields for different resolutions:
   *   hdUrl   — full-resolution / HD image
   *   oriUrl  — original-size image
   *   normalUrl — standard-resolution
   *   url     — generic media URL
   *   thumb   — thumbnail (lowest quality, always present for images)
   */
  private static pickBestImageUrl(data: any): string | null {
    const candidates = [
      data.hdUrl,
      data.oriUrl,
      data.normalUrl,
      data.url,
      data.thumb,
    ];

    for (const url of candidates) {
      if (typeof url === 'string' && url.length > 0) {
        return url;
      }
    }

    return null;
  }

  private static buildImageAttachment(url: string): { type: string; media_ref: string; url: string } {
    return {
      type: 'image',
      media_ref: url,
      url,
    };
  }
}
