import { Static, Type } from '@sinclair/typebox';

export const InboundEventType = Type.Union([
  Type.Literal('message.created'),
  Type.Literal('message.edited'),
  Type.Literal('message.recalled'),
  Type.Literal('message.delivered'),
  Type.Literal('message.read'),
  Type.Literal('message.failed'),
  Type.Literal('reaction.added'),
  Type.Literal('reaction.removed'),
  Type.Literal('typing.started'),
  Type.Literal('typing.stopped'),
  Type.Literal('thread.updated'),
  Type.Literal('participant.updated'),
  Type.Literal('session.connected'),
  Type.Literal('session.disconnected'),
  Type.Literal('session.expired'),
]);

export const InboundEventV1Schema = Type.Object({
  version: Type.Literal(1),
  event_id: Type.String(),
  integration_id: Type.Optional(Type.String()),
  type: InboundEventType,
  sequence: Type.Integer({ minimum: 1 }),
  occurred_at: Type.String(),
  session_generation: Type.Integer({ minimum: 0 }),
  data: Type.Record(Type.String(), Type.Any()),
});

export type InboundEventV1 = Static<typeof InboundEventV1Schema>;
export type InboundEventTypeEnum = Static<typeof InboundEventType>;
