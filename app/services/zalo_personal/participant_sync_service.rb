# frozen_string_literal: true

class ZaloPersonal::ParticipantSyncService
  def initialize(channel:, thread:)
    @channel = channel
    @thread = thread
  end

  def sync_participant(provider_user_id:, display_name: nil, avatar_url: nil, role: nil)
    contact = ZaloPersonal::ContactResolver.new(channel: @channel).resolve(
      provider_user_id: provider_user_id,
      display_name: display_name,
      avatar_url: avatar_url
    )

    participant = @thread.participants.find_or_initialize_by(
      provider_user_id: provider_user_id
    )

    participant.contact = contact
    participant.display_name = display_name if display_name.present?
    participant.avatar_url = avatar_url if avatar_url.present?
    participant.role = role if role.present?
    participant.active = true
    participant.last_synced_at = Time.current
    participant.save!

    participant
  end
end
