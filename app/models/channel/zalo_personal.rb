# frozen_string_literal: true

# == Schema Information
#
# Table name: channel_zalo_personal
#
#  id                 :bigint           not null, primary key
#  account_id         :bigint           not null
#  identifier         :string           not null
#  bridge_session_id  :string
#  zalo_user_id       :string
#  display_name       :string
#  avatar_url         :string
#  connection_status  :integer          default("provisioning"), not null
#  enabled            :boolean          default(TRUE), not null
#  session_generation :bigint           default(0), not null
#  last_connected_at  :datetime
#  last_event_at      :datetime
#  last_heartbeat_at  :datetime
#  capabilities       :jsonb            not null
#  provider_metadata  :jsonb            not null
#  signing_secret     :text             not null
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#

class Channel::ZaloPersonal < ApplicationRecord
  include Channelable
  include Reauthorizable

  self.table_name = 'channel_zalo_personal'
  EDITABLE_ATTRS = [].freeze

  encrypts :signing_secret if Chatwoot.encryption_configured?

  enum connection_status: {
    provisioning: 0,
    connecting: 1,
    connected: 2,
    degraded: 3,
    reconnecting: 4,
    reauthorization_required: 5,
    disconnected: 6,
    error: 7
  }

  has_many :threads, class_name: 'ZaloPersonal::Thread', foreign_key: :zalo_personal_channel_id, dependent: :destroy
  has_many :message_mappings, class_name: 'ZaloPersonal::MessageMapping', foreign_key: :zalo_personal_channel_id, dependent: :destroy
  has_many :webhook_events, class_name: 'ZaloPersonal::WebhookEvent', foreign_key: :zalo_personal_channel_id, dependent: :destroy

  before_validation :ensure_identifier, on: :create
  before_validation :ensure_signing_secret, on: :create
  before_destroy :cleanup_bridge_integration

  validates :identifier, presence: true, uniqueness: true

  def name
    'Zalo Personal'
  end

  def connected?
    connection_status == 'connected' && enabled?
  end

  def reply_available?
    connected?
  end

  def mark_connected!
    update!(
      connection_status: :connected,
      last_connected_at: Time.current,
      last_heartbeat_at: Time.current
    )
  end

  def mark_degraded!
    update!(connection_status: :degraded)
  end

  def mark_reconnecting!
    update!(connection_status: :reconnecting)
  end

  def prompt_reauthorization!
    update!(connection_status: :reauthorization_required)
    super
  end

  def disconnect!
    update!(connection_status: :disconnected, enabled: false)
    ZaloPersonal::BridgeClient.new.disconnect_integration(identifier)
  rescue StandardError => e
    Rails.logger.error "Failed to disconnect Zalo Personal bridge integration #{identifier}: #{e.message}"
  end

  def capability?(capability_name)
    capabilities[capability_name.to_s] == true
  end

  private

  def cleanup_bridge_integration
    return if identifier.blank?

    ZaloPersonal::BridgeClient.new.delete_integration(identifier)
    ZaloPersonal::ConnectionAttempt.where(account_id: account_id, target_inbox_id: inbox&.id).destroy_all
  rescue StandardError => e
    Rails.logger.error "Failed to cleanup Zalo Personal bridge integration #{identifier}: #{e.message}"
  end

  def ensure_identifier
    self.identifier ||= SecureRandom.uuid
  end

  def ensure_signing_secret
    self.signing_secret ||= SecureRandom.hex(32)
  end
end
