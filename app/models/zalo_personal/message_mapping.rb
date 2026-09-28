# frozen_string_literal: true

# == Schema Information
#
# Table name: zalo_personal_message_mappings
#
#  id                       :bigint           not null, primary key
#  zalo_personal_channel_id :bigint           not null
#  zalo_personal_thread_id  :bigint           not null
#  message_id               :bigint           not null
#  delivery_id              :uuid             not null
#  provider_message_id      :string
#  part_index               :integer          not null
#  part_kind                :integer          not null
#  direction                :integer          not null
#  status                   :integer          not null
#  provider_timestamp       :datetime
#  error_code               :string
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#

class ZaloPersonal::MessageMapping < ApplicationRecord
  self.table_name = 'zalo_personal_message_mappings'

  belongs_to :channel, class_name: 'Channel::ZaloPersonal', foreign_key: :zalo_personal_channel_id
  belongs_to :thread, class_name: 'ZaloPersonal::Thread', foreign_key: :zalo_personal_thread_id
  belongs_to :message

  enum direction: {
    incoming: 0,
    outgoing: 1
  }

  enum part_kind: {
    text: 0,
    attachment: 1,
    sticker: 2
  }

  enum status: {
    pending: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    failed: 4,
    unknown: 5
  }

  validates :delivery_id, presence: true
  validates :part_index, presence: true
end
