# frozen_string_literal: true

class ZaloPersonal::SyncGroupHistoryService
  MAX_COUNT = 200

  def initialize(channel:)
    @channel = channel
    @inbox = channel.inbox
    @account = channel.account
    @client = ZaloPersonal::BridgeClient.new
  end

  # Sync recent history for a specific group conversation.
  #
  # @param conversation [Conversation] the group conversation to sync
  # @param count [Integer] number of messages to fetch (max 200)
  # @return [Hash] { success:, imported_count:, skipped_count:, total_fetched:, error: }
  def perform(conversation:, count: 50)
    count = [count.to_i, MAX_COUNT].min
    count = 50 if count <= 0

    thread = find_thread(conversation)
    return failure('Conversation is not linked to a Zalo group thread') unless thread&.group?

    provider_thread_id = thread.provider_thread_id
    return failure('Missing provider thread ID') if provider_thread_id.blank?

    # 1. Fetch history from bridge
    res = @client.fetch_group_history(@channel.identifier, provider_thread_id, count: count)
    unless res[:success]
      return failure("Bridge returned error: #{res[:error]}")
    end

    messages = res.dig(:data, 'messages') || []
    return success(0, 0, 0) if messages.empty?

    # 2. Import each message using the same pipeline as real-time messages
    imported = 0
    skipped = 0

    messages.each do |msg_event|
      result = import_history_message(msg_event)
      if result == :imported
        imported += 1
      else
        skipped += 1
      end
    end

    Rails.logger.info(
      "Zalo group history sync for conversation #{conversation.id}: " \
      "fetched=#{messages.size} imported=#{imported} skipped=#{skipped}"
    )

    success(imported, skipped, messages.size)
  rescue StandardError => e
    Rails.logger.error "Zalo group history sync failed for conversation #{conversation.id}: #{e.class} — #{e.message}"
    failure(e.message)
  end

  private

  def find_thread(conversation)
    contact_inbox = conversation.contact_inbox
    return nil unless contact_inbox

    @channel.threads.find_by(contact_inbox_id: contact_inbox.id)
  end

  def import_history_message(msg_event)
    data = msg_event['data'] || {}
    msg_data = data['message'] || {}
    provider_msg_id = msg_data['id']

    # Dedup: skip if we already have this message
    return :skipped if provider_msg_id.present? && @channel.message_mappings.exists?(provider_message_id: provider_msg_id)

    # Use the standard incoming message pipeline (which handles thread
    # resolution, contact resolution, attachment import, and dedup)
    ZaloPersonal::IncomingMessageService.new(channel: @channel).perform(event_payload: msg_event)
    :imported
  rescue StandardError => e
    Rails.logger.warn "Skipping history message #{msg_data&.dig('id')}: #{e.message}"
    :skipped
  end

  def success(imported, skipped, total)
    { success: true, imported_count: imported, skipped_count: skipped, total_fetched: total }
  end

  def failure(error)
    { success: false, imported_count: 0, skipped_count: 0, total_fetched: 0, error: error }
  end
end
