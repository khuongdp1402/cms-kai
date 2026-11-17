// Characterization spec for the chat-facing ActionCable handlers (chat-parity C-96, C-97, C-98).
// Pins helper/actionCable.js:38-66 (event name -> handler table) and the store actions
// dispatched by message.created / message.updated / conversation.* / assignee.changed /
// typing on+off (auto-off after 30s) / contact.* / presence / mention :84-343.
// Complements actionCable.spec.js (copilot + unread counts).
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import ActionCableConnector from '../actionCable';
import DashboardAudioNotificationHelper from '../AudioAlerts/DashboardAudioNotificationHelper';
import { emitter } from 'shared/helpers/mitt';

vi.mock('shared/helpers/mitt', () => ({
  emitter: { emit: vi.fn() },
}));
vi.mock('dashboard/composables/useImpersonation', () => ({
  useImpersonation: () => ({ isImpersonating: { value: false } }),
}));
vi.mock('../AudioAlerts/DashboardAudioNotificationHelper', () => ({
  default: { onNewMessage: vi.fn() },
}));

global.chatwootConfig = { websocketURL: 'wss://test.chatwoot.com' };

describe('ActionCableConnector chat handlers', () => {
  let dispatch;
  let cable;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    dispatch = vi.fn();
    cable = ActionCableConnector.init(
      {
        dispatch,
        getters: {
          getCurrentAccountId: 1,
          'accounts/isFeatureEnabledonAccount': vi.fn(() => false),
        },
      },
      'token'
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('subscribes the chat events to their handlers', () => {
    expect(Object.keys(cable.events)).toEqual(
      expect.arrayContaining([
        'message.created',
        'message.updated',
        'conversation.created',
        'conversation.status_changed',
        'conversation.updated',
        'conversation.read',
        'conversation.contact_changed',
        'conversation.typing_on',
        'conversation.typing_off',
        'conversation.mentioned',
        'assignee.changed',
        'contact.updated',
        'contact.deleted',
        'presence.update',
        'notification.created',
        'conversation.unread_count_changed',
      ])
    );
    expect(cable.events['message.created']).toBe(cable.onMessageCreated);
    expect(cable.events['conversation.typing_on']).toBe(cable.onTypingOn);
  });

  describe('message.created', () => {
    const data = {
      id: 7,
      conversation_id: 12,
      conversation: { last_activity_at: 1700000000 },
    };

    it('adds the message and bumps the conversation last activity', () => {
      cable.onMessageCreated(data);
      expect(dispatch).toHaveBeenCalledWith('addMessage', data);
      expect(dispatch).toHaveBeenCalledWith('updateConversationLastActivity', {
        lastActivityAt: 1700000000,
        conversationId: 12,
      });
    });

    it('plays the new message sound / favicon dot through the audio helper', () => {
      cable.onMessageCreated(data);
      expect(DashboardAudioNotificationHelper.onNewMessage).toHaveBeenCalledWith(
        data
      );
    });
  });

  it('message.updated dispatches updateMessage (status ticks, edits, deletions)', () => {
    const data = { id: 7, status: 'read' };
    cable.onMessageUpdated(data);
    expect(dispatch).toHaveBeenCalledWith('updateMessage', data);
  });

  describe('conversation events', () => {
    it('conversation.created adds the conversation and refreshes the tab counts', () => {
      cable.onConversationCreated({ id: 1 });
      expect(dispatch).toHaveBeenCalledWith('addConversation', { id: 1 });
      expect(emitter.emit).toHaveBeenCalledWith('fetch_conversation_stats');
    });

    it('conversation.status_changed updates the conversation and refreshes counts', () => {
      cable.onStatusChange({ id: 1, status: 'resolved' });
      expect(dispatch).toHaveBeenCalledWith('updateConversation', {
        id: 1,
        status: 'resolved',
      });
      expect(emitter.emit).toHaveBeenCalledWith('fetch_conversation_stats');
    });

    it('conversation.updated updates the conversation and refreshes counts', () => {
      cable.onConversationUpdated({ id: 1, priority: 'high' });
      expect(dispatch).toHaveBeenCalledWith('updateConversation', {
        id: 1,
        priority: 'high',
      });
      expect(emitter.emit).toHaveBeenCalledWith('fetch_conversation_stats');
    });

    it('conversation.read updates the conversation without refetching counts', () => {
      cable.onConversationRead({ id: 1, unread_count: 0 });
      expect(dispatch).toHaveBeenCalledWith('updateConversation', {
        id: 1,
        unread_count: 0,
      });
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('assignee.changed updates the conversation (when it has an id) and refreshes counts', () => {
      cable.onAssigneeChanged({ id: 1, meta: {} });
      expect(dispatch).toHaveBeenCalledWith('updateConversation', {
        id: 1,
        meta: {},
      });
      expect(emitter.emit).toHaveBeenCalledWith('fetch_conversation_stats');
      dispatch.mockClear();
      cable.onAssigneeChanged({});
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('conversation.contact_changed pushes the new sender into the conversation', () => {
      cable.onConversationContactChange({
        id: 4,
        meta: { sender: { id: 9, name: 'New' } },
      });
      expect(dispatch).toHaveBeenCalledWith('updateConversationContact', {
        conversationId: 4,
        id: 9,
        name: 'New',
      });
    });

    it('conversation.mentioned stores the mention', () => {
      cable.onConversationMentioned({ id: 1 });
      expect(dispatch).toHaveBeenCalledWith('addMentions', { id: 1 });
    });
  });

  describe('typing indicator (C-40, C-97)', () => {
    const payload = { conversation: { id: 12 }, user: { id: 5, name: 'Khach' } };

    it('typing_on creates the typing status', () => {
      cable.onTypingOn(payload);
      expect(dispatch).toHaveBeenCalledWith('conversationTypingStatus/create', {
        conversationId: 12,
        user: payload.user,
      });
    });

    it('typing_off destroys the typing status', () => {
      cable.onTypingOff(payload);
      expect(dispatch).toHaveBeenCalledWith('conversationTypingStatus/destroy', {
        conversationId: 12,
        user: payload.user,
      });
    });

    it('typing turns itself off after 30 seconds without a typing_off', () => {
      cable.onTypingOn(payload);
      dispatch.mockClear();
      vi.advanceTimersByTime(29999);
      expect(dispatch).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(dispatch).toHaveBeenCalledWith('conversationTypingStatus/destroy', {
        conversationId: 12,
        user: payload.user,
      });
    });

    it('a second typing_on restarts the 30 second timer', () => {
      cable.onTypingOn(payload);
      vi.advanceTimersByTime(20000);
      cable.onTypingOn(payload);
      dispatch.mockClear();
      vi.advanceTimersByTime(20000);
      expect(dispatch).not.toHaveBeenCalled();
      vi.advanceTimersByTime(10000);
      expect(dispatch).toHaveBeenCalledWith(
        'conversationTypingStatus/destroy',
        expect.anything()
      );
    });

    it('typing_off cancels the pending auto-off', () => {
      cable.onTypingOn(payload);
      cable.onTypingOff(payload);
      dispatch.mockClear();
      vi.advanceTimersByTime(60000);
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('contacts, presence, notifications', () => {
    it('contact.updated / contact.deleted reach the contacts store', () => {
      cable.onContactUpdate({ id: 3 });
      expect(dispatch).toHaveBeenCalledWith('contacts/updateContact', { id: 3 });
      cable.onContactDelete({ id: 3 });
      expect(dispatch).toHaveBeenCalledWith(
        'contacts/deleteContactThroughConversations',
        3
      );
    });

    it('presence.update refreshes contact + agent presence and own availability', () => {
      const data = { contacts: { 1: 'online' }, users: { 2: 'busy' } };
      cable.onPresenceUpdate(data);
      expect(dispatch).toHaveBeenCalledWith(
        'contacts/updatePresence',
        data.contacts
      );
      expect(dispatch).toHaveBeenCalledWith('agents/updatePresence', data.users);
      expect(dispatch).toHaveBeenCalledWith(
        'setCurrentUserAvailability',
        data.users
      );
    });

    it('notification events reach the notifications store', () => {
      cable.onNotificationCreated({ id: 1 });
      expect(dispatch).toHaveBeenCalledWith('notifications/addNotification', {
        id: 1,
      });
      cable.onNotificationUpdated({ id: 1 });
      expect(dispatch).toHaveBeenCalledWith('notifications/updateNotification', {
        id: 1,
      });
      cable.onNotificationDeleted({ id: 1 });
      expect(dispatch).toHaveBeenCalledWith('notifications/deleteNotification', {
        id: 1,
      });
    });
  });

  it('only accepts events for the current account (isAValidEvent)', () => {
    expect(cable.isAValidEvent({ account_id: 1 })).toBe(true);
    expect(cable.isAValidEvent({ account_id: 2 })).toBe(false);
  });
});
