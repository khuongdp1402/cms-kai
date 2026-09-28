# frozen_string_literal: true

# == Schema Information
#
# Table name: zalo_personal_webhook_events
#
#  id                       :bigint           not null, primary key
#  zalo_personal_channel_id :bigint           not null
#  event_id                 :string           not null
#  event_type               :string           not null
#  thread_id                :string
#  sequence                 :bigint
#  provider_message_id      :string
#  payload                  :text             not null
#  payload_sha256           :string           not null
#  status                   :integer          default("pending"), not null
#  occurred_at              :datetime         not null
#  processed_at             :datetime
#  error_code               :string
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#

class ZaloPersonal::WebhookEvent < ApplicationRecord
  self.table_name = 'zalo_personal_webhook_events'

  encrypts :payload if Chatwoot.encryption_configured?

  belongs_to :channel, class_name: 'Channel::ZaloPersonal', foreign_key: :zalo_personal_channel_id

  enum status: {
    pending: 0,
    processed: 1,
    failed: 2
  }

  validates :event_id, presence: true
  validates :event_type, presence: true
  validates :payload_sha256, presence: true
end
