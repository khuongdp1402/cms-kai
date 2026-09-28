import { OutboundCommandV1 } from '../../contracts/outbound-command-v1.js';

export interface MappedZcaSendPayload {
  msg?: string;
  attachments?: string[];
  quote?: any;
  mentions?: any[];
  sticker?: any;
  targetId: string;
  isGroup: boolean;
}

export class SendMapper {
  static mapOutbound(command: OutboundCommandV1, localAttachmentPaths: string[] = []): MappedZcaSendPayload {
    const isGroup = command.thread.type === 'group';
    const targetId = command.thread.id;

    const payload: MappedZcaSendPayload = {
      targetId,
      isGroup,
      msg: command.message.text || undefined,
      attachments: localAttachmentPaths.length > 0 ? localAttachmentPaths : undefined,
    };

    if (command.message.sticker) {
      payload.sticker = command.message.sticker;
    }

    if (command.message.reply_to_id) {
      payload.quote = { msgId: command.message.reply_to_id };
    }

    if (command.message.mentions && command.message.mentions.length > 0) {
      payload.mentions = command.message.mentions.map((m) => ({
        uid: m.user_id,
        pos: m.pos,
        len: m.len,
      }));
    }

    return payload;
  }
}
