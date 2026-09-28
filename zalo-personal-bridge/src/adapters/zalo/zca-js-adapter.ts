import { Zalo, ThreadType } from 'zca-js';
import { ZaloSession, ZaloProfile, SessionHealth, ProviderSendResult, EventHandler } from './zalo-adapter.js';
import { OutboundCommandV1 } from '../../contracts/outbound-command-v1.js';
import { EventNormalizer } from './event-normalizer.js';
import { SendMapper } from './send-mapper.js';
import { ErrorClassifier } from './error-classifier.js';

export interface ZcaCredentials {
  cookie: any;
  imei: string;
  userAgent?: string;
}

export class ZcaJsAdapter implements ZaloSession {
  private zaloInstance: any;
  private zaloApi: any = null;
  private isListening = false;
  private lastHeartbeatTime: Date = new Date();
  private eventSequence = 1;

  constructor(
    public readonly integrationId: string,
    public readonly sessionGeneration: number,
    public readonly profile: ZaloProfile,
    private credentials: ZcaCredentials
  ) {
    this.zaloInstance = new Zalo({
      selfListen: true,
      checkUpdate: false,
    });
  }

  async login(): Promise<void> {
    this.zaloApi = await this.zaloInstance.login({
      cookie: this.credentials.cookie,
      imei: this.credentials.imei,
      userAgent: this.credentials.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    this.lastHeartbeatTime = new Date();
  }

  private groupCache: Map<string, { name: string; avatar_url?: string; expiresAt: number }> = new Map();

  async getGroupMetadata(threadId: string): Promise<{ name?: string; avatar_url?: string } | undefined> {
    const cached = this.groupCache.get(threadId);
    if (cached && cached.expiresAt > Date.now()) {
      return { name: cached.name, avatar_url: cached.avatar_url };
    }

    if (!this.zaloApi) {
      return undefined;
    }

    try {
      const res = await this.zaloApi.getGroupInfo(threadId);
      const groupInfo = res?.gridInfoMap?.[threadId];
      if (groupInfo && groupInfo.name) {
        const meta = {
          name: groupInfo.name,
          avatar_url: groupInfo.avt || groupInfo.fullAvt || undefined,
          expiresAt: Date.now() + 3600_000,
        };
        this.groupCache.set(threadId, meta);
        return { name: meta.name, avatar_url: meta.avatar_url };
      }
    } catch (err: any) {
      console.warn(`[Adapter ${this.integrationId}] Failed to fetch group info for ${threadId}:`, err?.message || err);
    }
    return undefined;
  }

  async getGroupsMetadata(threadIds: string[]): Promise<Array<{ id: string; name: string; avatar_url?: string }>> {
    if (!this.zaloApi || !threadIds || threadIds.length === 0) {
      return [];
    }

    const results: Array<{ id: string; name: string; avatar_url?: string }> = [];
    const missing: string[] = [];

    for (const tid of threadIds) {
      const cached = this.groupCache.get(tid);
      if (cached && cached.expiresAt > Date.now()) {
        results.push({ id: tid, name: cached.name, avatar_url: cached.avatar_url });
      } else {
        missing.push(tid);
      }
    }

    if (missing.length > 0) {
      try {
        const res = await this.zaloApi.getGroupInfo(missing);
        if (res?.gridInfoMap) {
          for (const [groupId, rawInfo] of Object.entries(res.gridInfoMap)) {
            const info = rawInfo as any;
            if (info && info.name) {
              const meta = {
                name: info.name,
                avatar_url: info.avt || info.fullAvt || undefined,
                expiresAt: Date.now() + 3600_000,
              };
              this.groupCache.set(groupId, meta);
              results.push({ id: groupId, name: info.name, avatar_url: meta.avatar_url });
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Adapter ${this.integrationId}] Failed batch getGroupInfo:`, err?.message || err);
        // Fallback to one-by-one fetch
        for (const tid of missing) {
          const meta = await this.getGroupMetadata(tid);
          if (meta && meta.name) {
            results.push({ id: tid, name: meta.name, avatar_url: meta.avatar_url });
          }
        }
      }
    }

    return results;
  }

  async fetchAllGroups(): Promise<Array<{ id: string; name: string; avatar_url?: string; total_members?: number }>> {
    if (!this.zaloApi) {
      return [];
    }

    try {
      const allGroupsRes = await this.zaloApi.getAllGroups();
      const groupIds = Object.keys(allGroupsRes?.gridVerMap || {});
      if (groupIds.length === 0) return [];

      const res = await this.zaloApi.getGroupInfo(groupIds);
      const list: Array<{ id: string; name: string; avatar_url?: string; total_members?: number }> = [];

      if (res?.gridInfoMap) {
        for (const [groupId, rawInfo] of Object.entries(res.gridInfoMap)) {
          const info = rawInfo as any;
          if (info && info.name) {
            const meta = {
              name: info.name,
              avatar_url: info.avt || info.fullAvt || undefined,
              expiresAt: Date.now() + 3600_000,
            };
            this.groupCache.set(groupId, meta);
            list.push({
              id: groupId,
              name: info.name,
              avatar_url: meta.avatar_url,
              total_members: info.totalMember,
            });
          }
        }
      }
      return list;
    } catch (err: any) {
      console.error(`[Adapter ${this.integrationId}] Error fetching all groups:`, err?.message || err);
      return [];
    }
  }

  async fetchAllFriends(): Promise<Array<{ id: string; name: string; avatar_url?: string; phone?: string }>> {
    if (!this.zaloApi) {
      await this.login();
    }

    try {
      const friends = await this.zaloApi.getAllFriends();
      if (!Array.isArray(friends) || friends.length === 0) return [];

      return friends
        .filter((f: any) => f.userId && (f.displayName || f.zaloName))
        .map((f: any) => ({
          id: String(f.userId),
          name: f.displayName || f.zaloName || `Zalo User ${String(f.userId).slice(-4)}`,
          avatar_url: f.avatar || undefined,
          phone: f.phoneNumber || undefined,
        }));
    } catch (err: any) {
      console.error(`[Adapter ${this.integrationId}] Error fetching all friends:`, err?.message || err);
      return [];
    }
  }

  async startListener(handler: EventHandler): Promise<void> {
    if (!this.zaloApi) {
      await this.login();
    }

    if (this.isListening) {
      return;
    }

    // ── Real-time messages (both direct and group) ──
    this.zaloApi.listener.on('message', async (rawMsg: any) => {
      this.lastHeartbeatTime = new Date();
      console.log(`[Adapter ${this.integrationId}] Received real-time message from Zalo`);
      try {
        await this.processRawMessage(rawMsg, handler);
      } catch (err: any) {
        console.error(`[Adapter ${this.integrationId}] Error processing message:`, err);
      }
    });

    // ── Old / unread messages delivered on connect ──
    // When the listener first connects, Zalo pushes recent unread messages
    // via the 'old_messages' event. Without handling this, messages that
    // arrived while the bridge was offline are silently dropped.
    this.zaloApi.listener.on('old_messages', async (messages: any[], threadType: any) => {
      this.lastHeartbeatTime = new Date();
      console.log(`[Adapter ${this.integrationId}] Received ${messages.length} old/unread messages (threadType=${threadType})`);
      for (const rawMsg of messages) {
        try {
          await this.processRawMessage(rawMsg, handler);
        } catch (err: any) {
          console.error(`[Adapter ${this.integrationId}] Error processing old message:`, err);
        }
      }
    });

    // ── Group events (new group, member join/leave, settings changes) ──
    this.zaloApi.listener.on('group_event', async (event: any) => {
      this.lastHeartbeatTime = new Date();
      const eventType = event?.type || 'unknown';
      const groupId = event?.threadId || event?.data?.groupId || '';
      console.log(`[Adapter ${this.integrationId}] Group event: ${eventType} for group ${groupId}`);

      // Invalidate group cache so the next message fetch picks up new metadata
      if (groupId) {
        this.groupCache.delete(groupId);
      }
    });

    // ── Message undo / recall ──
    this.zaloApi.listener.on('undo', async (undoData: any) => {
      this.lastHeartbeatTime = new Date();
      console.log(`[Adapter ${this.integrationId}] Message undo/recall event`);
      // Future: could emit a 'message.recalled' inbound event
    });

    // ── Connection lifecycle ──
    this.zaloApi.listener.on('connected', () => {
      this.lastHeartbeatTime = new Date();
      console.log(`[Adapter ${this.integrationId}] Zalo WebSocket connected — requesting message sync`);

      // Request old/unread messages for both direct and group threads.
      // This is how the Zalo app syncs messages on startup — the server
      // pushes recent unread messages back via the 'old_messages' event.
      try {
        this.zaloApi.listener.requestOldMessages(ThreadType.User);
        this.zaloApi.listener.requestOldMessages(ThreadType.Group);
        console.log(`[Adapter ${this.integrationId}] Requested old messages for User and Group threads`);
      } catch (err: any) {
        console.error(`[Adapter ${this.integrationId}] Failed to request old messages:`, err?.message || err);
      }
    });

    this.zaloApi.listener.on('error', (error: unknown) => {
      console.error(`[Adapter ${this.integrationId}] Zalo WebSocket error:`, error);
    });

    this.zaloApi.listener.on('closed', (code: number, reason: string) => {
      console.warn(`[Adapter ${this.integrationId}] Zalo WebSocket closed: code=${code} reason=${reason}`);
      this.isListening = false;
    });

    this.zaloApi.listener.start();
    this.isListening = true;
  }

  /**
   * Shared logic for processing a single raw message from either
   * the real-time 'message' event or the 'old_messages' batch.
   */
  private async processRawMessage(rawMsg: any, handler: EventHandler): Promise<void> {
    const isGroup = rawMsg.type === 1 || rawMsg.isGroup || (rawMsg.threadId && rawMsg.data?.uidFrom && rawMsg.threadId !== rawMsg.data?.uidFrom);
    const threadId = String(rawMsg.threadId || rawMsg.data?.fromId || rawMsg.data?.uidFrom || '');
    let groupMeta: { name?: string; avatar_url?: string } | undefined;

    if (isGroup && threadId) {
      groupMeta = await this.getGroupMetadata(threadId);
    }

    const normalized = EventNormalizer.normalize(
      rawMsg,
      this.integrationId,
      this.sessionGeneration,
      this.eventSequence++,
      groupMeta
    );
    if (normalized) {
      // Preserve original Zalo timestamp when available
      const ts = rawMsg.data?.ts;
      if (ts) {
        const tsNum = parseInt(ts, 10);
        if (!isNaN(tsNum) && tsNum > 0) {
          const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
          normalized.occurred_at = new Date(tsMs).toISOString();
        }
      }
      await handler(normalized);
    } else {
      console.warn(`[Adapter ${this.integrationId}] Normalizer returned null for raw message`);
    }
  }

  async send(command: OutboundCommandV1, localAttachmentPaths: string[] = []): Promise<ProviderSendResult> {
    if (!this.zaloApi) {
      await this.login();
    }

    try {
      const mapped = SendMapper.mapOutbound(command, localAttachmentPaths);
      const targetType = mapped.isGroup ? ThreadType.Group : ThreadType.User;

      const payload: any = {};
      if (mapped.msg) payload.msg = mapped.msg;
      if (mapped.attachments) payload.attachments = mapped.attachments;
      if (mapped.quote) payload.quote = mapped.quote;
      if (mapped.mentions) payload.mentions = mapped.mentions;

      const res = await this.zaloApi.sendMessage(payload, mapped.targetId, targetType);
      this.lastHeartbeatTime = new Date();

      const providerId = res?.msgId || res?.data?.msgId || `zalo_sent_${Date.now()}`;
      return {
        success: true,
        providerMessageIds: [String(providerId)],
      };
    } catch (err: any) {
      const classified = ErrorClassifier.classify(err);
      return {
        success: false,
        providerMessageIds: [],
        error: classified.message,
        errorCode: classified.kind,
      };
    }
  }

  async healthCheck(): Promise<SessionHealth> {
    const isAlive = !!this.zaloApi && this.isListening;
    return {
      connected: isAlive,
      lastHeartbeat: this.lastHeartbeatTime,
      activeListeners: this.isListening ? 1 : 0,
    };
  }

  /**
   * Fetch recent chat history for a group thread.
   * Returns normalized InboundEventV1-shaped objects so the Rails side can
   * import them with the same pipeline used for real-time messages.
   */
  async fetchGroupHistory(
    groupId: string,
    count: number = 50
  ): Promise<{ messages: any[]; hasMore: boolean }> {
    if (!this.zaloApi) {
      await this.login();
    }

    try {
      const res = await this.zaloApi.getGroupChatHistory(groupId, count);
      const groupMsgs = res?.groupMsgs || [];
      const hasMore = (res?.more ?? 0) > 0;

      const groupMeta = await this.getGroupMetadata(groupId);

      const messages: any[] = [];
      for (let i = 0; i < groupMsgs.length; i++) {
        const raw = groupMsgs[i];
        const normalized = EventNormalizer.normalize(
          raw,
          this.integrationId,
          this.sessionGeneration,
          i + 1,
          groupMeta
        );
        if (normalized) {
          // Override occurred_at with the original message timestamp when available
          const ts = raw.data?.ts;
          if (ts) {
            const tsNum = parseInt(ts, 10);
            if (!isNaN(tsNum) && tsNum > 0) {
              // Zalo timestamps are in milliseconds
              const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
              normalized.occurred_at = new Date(tsMs).toISOString();
            }
          }
          messages.push(normalized);
        }
      }

      // Sort oldest-first so Rails imports in chronological order
      messages.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

      return { messages, hasMore };
    } catch (err: any) {
      console.error(`[Adapter ${this.integrationId}] Error fetching group history for ${groupId}:`, err?.message || err);
      throw err;
    }
  }

  async stop(reason: string): Promise<void> {
    if (this.zaloApi?.listener && this.isListening) {
      try {
        this.zaloApi.listener.stop();
      } catch {}
      this.isListening = false;
    }
  }
}

