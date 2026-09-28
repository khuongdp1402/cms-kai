# frozen_string_literal: true

# == Schema Information
#
# Table name: zalo_personal_connection_attempts
#
#  id                :bigint           not null, primary key
#  account_id        :bigint           not null
#  requested_by_id   :bigint           not null
#  target_inbox_id   :bigint
#  public_id         :string           not null
#  purpose           :integer          not null
#  bridge_session_id :string
#  status            :integer          default("pending"), not null
#  profile           :jsonb            not null
#  capabilities      :jsonb            not null
#  signing_secret    :text             not null
#  expires_at        :datetime         not null
#  authenticated_at  :datetime
#  consumed_at       :datetime
#  error_code        :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

class ZaloPersonal::ConnectionAttempt < ApplicationRecord
  self.table_name = 'zalo_personal_connection_attempts'

  ACTIVE_STATUSES = %w[pending qr_ready scanned awaiting_confirmation authenticated].freeze

  encrypts :signing_secret if Chatwoot.encryption_configured?

  belongs_to :account
  belongs_to :requested_by, class_name: 'User'
  belongs_to :target_inbox, class_name: 'Inbox', optional: true

  enum purpose: {
    create_channel: 0,
    reconnect: 1
  }

  enum status: {
    pending: 0,
    qr_ready: 1,
    scanned: 2,
    awaiting_confirmation: 3,
    authenticated: 4,
    provisioning: 5,
    consumed: 6,
    expired: 7,
    declined: 8,
    cancelled: 9,
    failed: 10
  }

  before_validation :ensure_public_id, on: :create
  before_validation :ensure_signing_secret, on: :create
  before_validation :ensure_expiry, on: :create

  validates :public_id, presence: true, uniqueness: true
  validates :purpose, presence: true

  scope :active, -> { where(status: ACTIVE_STATUSES).where('expires_at > ?', Time.current) }

  def active?
    status.in?(ACTIVE_STATUSES) && !expired?
  end

  def expired?
    expires_at <= Time.current
  end

  def can_consume?
    authenticated? && !consumed? && !expired?
  end

  def bridge_integration_id
    reconnect? ? target_inbox.channel.identifier : public_id
  end

  def cancel!
    update!(status: :cancelled)
  end

  private

  def ensure_public_id
    self.public_id ||= "zca_#{SecureRandom.hex(16)}"
  end

  def ensure_signing_secret
    self.signing_secret ||= SecureRandom.hex(32)
  end

  def ensure_expiry
    self.expires_at ||= 2.minutes.from_now
  end
end
