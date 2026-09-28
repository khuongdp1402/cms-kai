import { Static, Type } from '@sinclair/typebox';

export const QrFlowStatusEnum = Type.Union([
  Type.Literal('pending'),
  Type.Literal('qr_ready'),
  Type.Literal('scanned'),
  Type.Literal('awaiting_confirmation'),
  Type.Literal('authenticated'),
  Type.Literal('expired'),
  Type.Literal('declined'),
  Type.Literal('cancelled'),
  Type.Literal('failed'),
]);

export const QrProfileSchema = Type.Object({
  user_id: Type.String(),
  display_name: Type.String(),
  avatar_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const QrFlowV1Schema = Type.Object({
  flow_id: Type.String(),
  status: QrFlowStatusEnum,
  qr_data_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  expires_at: Type.String(),
  authenticated_at: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  profile: Type.Optional(QrProfileSchema),
  capabilities: Type.Optional(Type.Record(Type.String(), Type.Any())),
  error_code: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export type QrFlowV1 = Static<typeof QrFlowV1Schema>;
export type QrFlowStatus = Static<typeof QrFlowStatusEnum>;
