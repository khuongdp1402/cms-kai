import { Static, Type } from '@sinclair/typebox';

export const OutboundAttachmentSchema = Type.Object({
  chatwoot_attachment_id: Type.Integer(),
  type: Type.Union([
    Type.Literal('image'),
    Type.Literal('gif'),
    Type.Literal('video'),
    Type.Literal('audio'),
    Type.Literal('voice'),
    Type.Literal('file'),
    Type.Literal('sticker'),
    Type.Literal('location'),
    Type.Literal('contact'),
    Type.Literal('link'),
    Type.Literal('unsupported'),
  ]),
  download_url: Type.String(),
  filename: Type.Optional(Type.String()),
  mime_type: Type.Optional(Type.String()),
  byte_size: Type.Optional(Type.Integer()),
  checksum: Type.Optional(Type.String()),
});

export const OutboundMentionSchema = Type.Object({
  user_id: Type.String(),
  pos: Type.Integer({ minimum: 0 }),
  len: Type.Integer({ minimum: 1 }),
});

export const OutboundStickerSchema = Type.Object({
  id: Type.String(),
  pack_id: Type.Optional(Type.String()),
  category_id: Type.Optional(Type.String()),
});

export const OutboundCommandV1Schema = Type.Object({
  version: Type.Literal(1),
  delivery_id: Type.String(),
  idempotency_key: Type.String({ minLength: 1 }),
  session_generation: Type.Integer({ minimum: 0 }),
  thread: Type.Object({
    id: Type.String({ minLength: 1 }),
    type: Type.Union([Type.Literal('direct'), Type.Literal('group')]),
  }),
  message: Type.Object({
    text: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    reply_to_id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    mentions: Type.Optional(Type.Array(OutboundMentionSchema)),
    attachments: Type.Optional(Type.Array(OutboundAttachmentSchema)),
    sticker: Type.Optional(Type.Union([OutboundStickerSchema, Type.Null()])),
  }),
});

export type OutboundCommandV1 = Static<typeof OutboundCommandV1Schema>;
export type OutboundAttachment = Static<typeof OutboundAttachmentSchema>;
export type OutboundMention = Static<typeof OutboundMentionSchema>;
export type OutboundSticker = Static<typeof OutboundStickerSchema>;
