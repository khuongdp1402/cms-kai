# frozen_string_literal: true

class ZaloPersonal::OutboundMessagePayloadBuilder
  def initialize(message:, delivery_id:)
    @message = message
    @conversation = message.conversation
    @channel = message.inbox.channel
    @delivery_id = delivery_id
  end

  def build
    thread_data = resolve_thread_data
    attachments_data = build_attachments_data
    mentions_data = build_mentions_data
    sticker_data = @message.content_attributes&.dig('sticker')
    reply_to_id = resolve_reply_to_id

    {
      version: 1,
      delivery_id: @delivery_id,
      idempotency_key: "cw_msg_#{@message.id}_#{@delivery_id}",
      session_generation: @channel.session_generation,
      thread: thread_data,
      message: {
        text: @message.content,
        reply_to_id: reply_to_id,
        mentions: mentions_data,
        attachments: attachments_data,
        sticker: sticker_data
      }
    }
  end

  private

  def resolve_thread_data
    source_id = @conversation.contact_inbox.source_id.to_s
    parts = source_id.split(':')

    if parts[0] == 'zalo_personal'
      thread_type = parts[1] == 'group' ? 'group' : 'direct'
      thread_id = parts[2]
      { id: thread_id, type: thread_type }
    else
      # Fallback for legacy or direct
      { id: source_id, type: 'direct' }
    end
  end

  def build_attachments_data
    @message.attachments.map do |att|
      {
        chatwoot_attachment_id: att.id,
        type: att.file_type || 'image',
        download_url: att.download_url,
        filename: att.file&.filename&.to_s,
        mime_type: att.file&.content_type,
        byte_size: att.file&.byte_size
      }
    end
  end

  def build_mentions_data
    mentions = @message.content_attributes&.dig('mentions')
    return [] unless mentions.is_a?(Array)

    mentions.map do |m|
      {
        user_id: m['user_id'] || m['id'],
        pos: m['pos'] || 0,
        len: m['len'] || 1
      }
    end
  end

  def resolve_reply_to_id
    in_reply_to_msg_id = @message.content_attributes&.dig('in_reply_to')
    return nil unless in_reply_to_msg_id

    mapping = @channel.message_mappings.find_by(message_id: in_reply_to_msg_id)
    mapping&.provider_message_id
  end
end
