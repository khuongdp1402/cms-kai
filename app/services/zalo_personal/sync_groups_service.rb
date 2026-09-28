# frozen_string_literal: true

class ZaloPersonal::SyncGroupsService
  def initialize(channel:)
    @channel = channel
    @client = ZaloPersonal::BridgeClient.new
  end

  def perform(group_ids: nil)
    ids_to_sync = group_ids.presence || @channel.threads.where(thread_type: :group).pluck(:provider_thread_id)
    return { success: true, synced_count: 0, groups: [] } if ids_to_sync.blank?

    res = @client.get_groups_batch(@channel.identifier, ids_to_sync)
    groups = res[:success] && res.dig(:data, 'groups').is_a?(Array) ? res.dig(:data, 'groups') : []

    # If batch returns nothing or fails, fallback to one-by-one
    if groups.empty?
      ids_to_sync.each do |tid|
        single_res = @client.get_group(@channel.identifier, tid)
        if single_res[:success] && single_res.dig(:data, 'name').present?
          groups << {
            'id' => tid,
            'name' => single_res.dig(:data, 'name'),
            'avatar_url' => single_res.dig(:data, 'avatar_url')
          }
        end
      end
    end

    resolver = ZaloPersonal::ThreadResolver.new(channel: @channel)
    synced_count = 0

    groups.each do |grp|
      next if grp['id'].blank?

      resolver.resolve(
        provider_thread_id: grp['id'].to_s,
        thread_type: :group,
        name: grp['name'],
        avatar_url: grp['avatar_url']
      )
      synced_count += 1
    end

    { success: true, synced_count: synced_count, groups: groups }
  rescue StandardError => e
    Rails.logger.error "Failed to sync Zalo groups for channel #{@channel.id}: #{e.message}"
    { success: false, error: e.message }
  end
end
