# frozen_string_literal: true

class ZaloPersonal::MigrateLegacyInboxJob < ApplicationJob
  queue_as :default

  def perform(inbox_id)
    inbox = Inbox.find_by(id: inbox_id)
    return unless inbox && inbox.channel_type == 'Channel::Api'

    attrs = inbox.channel.additional_attributes || {}
    return unless attrs['channel'] == 'zalo_personal' || attrs['zalo_type'] == 'personal'

    ActiveRecord::Base.transaction do
      # 1. Create Channel::ZaloPersonal
      zalo_channel = inbox.account.zalo_personal_channels.create!(
        identifier: SecureRandom.uuid,
        zalo_user_id: attrs['zalo_user_id'],
        display_name: attrs['zalo_name'] || inbox.name,
        avatar_url: attrs['zalo_avatar'],
        connection_status: :reauthorization_required,
        signing_secret: SecureRandom.hex(32)
      )

      # 2. Re-point Inbox channel
      old_channel = inbox.channel
      inbox.update_columns(channel_type: 'Channel::ZaloPersonal', channel_id: zalo_channel.id)
      old_channel.destroy if old_channel

      # 3. Migrate ContactInboxes
      inbox.contact_inboxes.find_each do |ci|
        old_source_id = ci.source_id.to_s
        new_source_id = if old_source_id.start_with?('zalo_personal:')
                          old_source_id
                        elsif old_source_id.start_with?('group_') || old_source_id.start_with?('g_')
                          "zalo_personal:group:#{old_source_id.sub(/\A(group_|g_)/, '')}"
                        else
                          "zalo_personal:direct:#{old_source_id}"
                        end

        ci.update_columns(source_id: new_source_id)

        # Create Thread record
        is_group = new_source_id.start_with?('zalo_personal:group:')
        thread_id = new_source_id.split(':').last

        zalo_channel.threads.find_or_create_by!(
          provider_thread_id: thread_id,
          thread_type: is_group ? :group : :direct
        ) do |t|
          t.contact_inbox = ci
          t.name = ci.contact&.name
        end
      end
    end
  end
end
