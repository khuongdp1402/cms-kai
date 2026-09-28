import { Static, Type } from '@sinclair/typebox';

export const IntegrationStatusEnum = Type.Union([
  Type.Literal('disabled'),
  Type.Literal('needs_qr'),
  Type.Literal('qr_pending'),
  Type.Literal('awaiting_confirmation'),
  Type.Literal('connecting'),
  Type.Literal('connected'),
  Type.Literal('degraded'),
  Type.Literal('reconnecting'),
  Type.Literal('reauth_required'),
  Type.Literal('stopping'),
]);

export const StatusV1Schema = Type.Object({
  integration_id: Type.String(),
  status: IntegrationStatusEnum,
  session_generation: Type.Integer({ minimum: 0 }),
  lease_owner: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  lease_until: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  profile: Type.Optional(Type.Object({
    user_id: Type.String(),
    display_name: Type.String(),
    avatar_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  })),
  capabilities: Type.Record(Type.String(), Type.Any()),
  last_heartbeat_at: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export type StatusV1 = Static<typeof StatusV1Schema>;
export type IntegrationStatus = Static<typeof IntegrationStatusEnum>;
