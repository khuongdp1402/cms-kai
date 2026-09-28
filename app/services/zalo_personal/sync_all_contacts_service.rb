# frozen_string_literal: true

class ZaloPersonal::SyncAllContactsService
  def initialize(channel:)
    @channel = channel
    @inbox = channel.inbox
    @account = channel.account
    @client = ZaloPersonal::BridgeClient.new
  end

  # Sync all friends and groups from Zalo, creating conversations
  # in Chatwoot for any that don't yet exist.
  #
  # @return [Hash] { success:, friends_synced:, groups_synced:, error: }
  def perform
    # 1. Fetch contacts from bridge
    res = @client.fetch_all_contacts(@channel.identifier)
    unless res[:success]
      return failure("Bridge error: #{res[:error]}")
    end

    friends = res.dig(:data, 'friends') || []
    groups = res.dig(:data, 'groups') || []

    resolver = ZaloPersonal::ThreadResolver.new(channel: @channel)
    friends_synced = 0
    groups_synced = 0

    # 2. Sync direct conversations (friends)
    friends.each do |friend|
      next if friend['id'].blank?

      resolver.resolve(
        provider_thread_id: friend['id'].to_s,
        thread_type: :direct,
        name: friend['name'],
        avatar_url: friend['avatar_url'],
        sender_info: {
          name: friend['name'],
          avatar_url: friend['avatar_url']
        }
      )
      friends_synced += 1
    rescue StandardError => e
      Rails.logger.warn "Failed to sync Zalo friend #{friend['id']}: #{e.message}"
    end

    # 3. Sync group conversations
    groups.each do |grp|
      next if grp['id'].blank?

      resolver.resolve(
        provider_thread_id: grp['id'].to_s,
        thread_type: :group,
        name: grp['name'],
        avatar_url: grp['avatar_url']
      )
      groups_synced += 1
    rescue StandardError => e
      Rails.logger.warn "Failed to sync Zalo group #{grp['id']}: #{e.message}"
    end

    # 4. Also trigger message sync so recent messages appear
    @client.force_sync(@channel.identifier)

    Rails.logger.info(
      "Zalo contacts sync for channel #{@channel.id}: " \
      "friends=#{friends_synced}/#{friends.size} groups=#{groups_synced}/#{groups.size}"
    )

    {
      success: true,
      friends_synced: friends_synced,
      groups_synced: groups_synced,
      total_friends: friends.size,
      total_groups: groups.size
    }
  rescue StandardError => e
    Rails.logger.error "Zalo contacts sync failed for channel #{@channel.id}: #{e.class} — #{e.message}"
    failure(e.message)
  end

  private

  def failure(error)
    { success: false, friends_synced: 0, groups_synced: 0, total_friends: 0, total_groups: 0, error: error }
  end
end
