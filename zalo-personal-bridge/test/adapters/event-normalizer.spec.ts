import { describe, it, expect } from 'vitest';
import { EventNormalizer } from '../../src/adapters/zalo/event-normalizer.js';

describe('EventNormalizer', () => {
  it('normalizes direct text message correctly', () => {
    const raw = {
      threadId: 'user_12345',
      data: {
        uidFrom: 'user_12345',
        dName: 'Nguyen Van A',
        msg: 'Xin chao Chatwoot',
        msgId: 'zalo_msg_999',
      },
    };

    const event = EventNormalizer.normalize(raw, 'integ_1', 1, 1);
    expect(event).toBeDefined();
    expect(event?.type).toBe('message.created');
    expect(event?.data.thread.type).toBe('direct');
    expect(event?.data.thread.id).toBe('user_12345');
    expect(event?.data.sender.name).toBe('Nguyen Van A');
    expect(event?.data.message.text).toBe('Xin chao Chatwoot');
    expect(event?.data.message.id).toBe('zalo_msg_999');
  });

  it('normalizes group message correctly', () => {
    const raw = {
      type: 1, // Group
      threadId: 'group_789',
      data: {
        uidFrom: 'member_456',
        dName: 'Member B',
        msg: 'Hello group',
        msgId: 'zalo_msg_888',
      },
    };

    const event = EventNormalizer.normalize(raw, 'integ_1', 1, 2);
    expect(event).toBeDefined();
    expect(event?.data.thread.type).toBe('group');
    expect(event?.data.thread.id).toBe('group_789');
    expect(event?.data.sender.id).toBe('member_456');
  });
});
