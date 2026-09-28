# frozen_string_literal: true

class ZaloPersonal::IncomingMessageService
  def initialize(channel:)
    @channel = channel
    @inbox = channel.inbox
    @account = channel.account
  end

  def perform(event_payload:)
    data = event_payload['data'] || {}
    thread_data = data['thread'] || {}
    sender_data = data['sender'] || {}
    msg_data = data['message'] || {}

    provider_thread_id = thread_data['id']
    thread_type = thread_data['type'] || 'direct'
    provider_msg_id = msg_data['id']

    # 1. Deduplication check — exact provider_message_id match
    existing_mapping = @channel.message_mappings.find_by(provider_message_id: provider_msg_id)
    return existing_mapping.message if existing_mapping.present?

    # 1b. Self-message echo dedup: when a message sent from Chatwoot comes back
    # via the listener, the mapping only has delivery_id (no provider_message_id).
    # Detect this by matching recent outgoing messages with same content in the
    # same thread, then backfill provider_message_id for future dedup.
    direction = msg_data['direction'] == 'outgoing' ? :outgoing : :incoming
    if direction == :outgoing && provider_thread_id.present?
      thread = @channel.threads.find_by(provider_thread_id: provider_thread_id)
      if thread
        echo_mapping = find_outgoing_echo(thread, msg_data['text'], provider_msg_id)
        if echo_mapping
          echo_mapping.update_columns(provider_message_id: provider_msg_id) if provider_msg_id.present?
          return echo_mapping.message
        end
      end
    end

    # 2. Resolve Thread & Conversation
    resolved = ZaloPersonal::ThreadResolver.new(channel: @channel).resolve(
      provider_thread_id: provider_thread_id,
      thread_type: thread_type,
      name: thread_data['name'],
      avatar_url: thread_data['avatar_url'],
      sender_info: {
        name: sender_data['name'],
        avatar_url: sender_data['avatar_url']
      }
    )

    thread = resolved[:thread]
    conversation = resolved[:conversation]

    # 3. Determine Message Sender
    sender = if thread.group?
               participant = ZaloPersonal::ParticipantSyncService.new(channel: @channel, thread: thread).sync_participant(
                 provider_user_id: sender_data['id'],
                 display_name: sender_data['name'],
                 avatar_url: sender_data['avatar_url']
               )
               participant.contact
             else
               conversation.contact
             end

    message_type = direction == :outgoing ? :outgoing : :incoming

    # 4. Create Message
    message = conversation.messages.build(
      account_id: @account.id,
      inbox_id: @inbox.id,
      message_type: message_type,
      sender: sender,
      content: msg_data['text'].presence,
      source_id: provider_msg_id
    )

    if msg_data['reply_to_id'].present?
      quoted_mapping = @channel.message_mappings.find_by(provider_message_id: msg_data['reply_to_id'])
      message.content_attributes = { in_reply_to: quoted_mapping.message_id } if quoted_mapping.present?
    end

    message.save!

    # 5. Create Message Mapping
    delivery_id = SecureRandom.uuid
    @channel.message_mappings.create!(
      thread: thread,
      message: message,
      delivery_id: delivery_id,
      provider_message_id: provider_msg_id,
      part_index: 0,
      part_kind: :text,
      direction: direction,
      status: :delivered,
      provider_timestamp: event_payload['occurred_at']
    )

    # 6. Import Attachments
    if msg_data['attachments'].is_a?(Array)
      importer = ZaloPersonal::AttachmentImporter.new(message: message)
      msg_data['attachments'].each do |att|
        importer.import_from_url(
          url: att['url'] || att['media_ref'],
          file_type: att['type'] || :image,
          filename: att['filename']
        )
      end
    end

    message
  end

  private

  # Find a recent outgoing message mapping in the same thread whose message
  # content matches the echo text. This catches messages sent from Chatwoot
  # that echo back via the listener with a new Zalo provider_message_id.
  # Only looks at messages from the last 5 minutes to keep the window tight.
  def find_outgoing_echo(thread, echo_text, provider_msg_id)
    return nil if echo_text.blank?

    recent_mappings = @channel.message_mappings
                              .where(thread: thread, direction: :outgoing)
                              .where(provider_message_id: [nil, ''])
                              .where('created_at > ?', 5.minutes.ago)
                              .includes(:message)
                              .order(created_at: :desc)
                              .limit(10)

    recent_mappings.find do |mapping|
      mapping.message&.content.present? && mapping.message.content.strip == echo_text.strip
    end
  end
end

