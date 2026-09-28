import { InboundEventV1 } from '../../contracts/inbound-event-v1.js';
import { OutboundCommandV1 } from '../../contracts/outbound-command-v1.js';

export interface ZaloProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
}

export interface SessionHealth {
  connected: boolean;
  lastHeartbeat: Date;
  activeListeners: number;
}

export interface ProviderSendResult {
  success: boolean;
  providerMessageIds: string[];
  error?: string;
  errorCode?: string;
}

export type EventHandler = (event: InboundEventV1) => Promise<void>;

export interface ZaloSession {
  readonly profile: ZaloProfile;
  startListener(handler: EventHandler): Promise<void>;
  send(command: OutboundCommandV1): Promise<ProviderSendResult>;
  healthCheck(): Promise<SessionHealth>;
  getStickers?(): Promise<any[]>;
  stop(reason: string): Promise<void>;
}
