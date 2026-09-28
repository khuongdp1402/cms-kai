# frozen_string_literal: true

# == Schema Information
#
# Table name: zalo_personal_threads
#
#  id                       :bigint           not null, primary key
#  zalo_personal_channel_id :bigint           not null
#  contact_inbox_id         :bigint           not null
#  provider_thread_id       :string           not null
#  thread_type              :integer          not null
#  name                     :string
#  avatar_url               :string
#  member_count             :integer
#  provider_metadata        :jsonb            not null
#  last_synced_at           :datetime
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#

class ZaloPersonal::Thread < ApplicationRecord
  self.table_name = 'zalo_personal_threads'

  belongs_to :channel, class_name: 'Channel::ZaloPersonal', foreign_key: :zalo_personal_channel_id
  belongs_to :contact_inbox

  has_many :participants, class_name: 'ZaloPersonal::ThreadParticipant', foreign_key: :zalo_personal_thread_id, dependent: :destroy
  has_many :message_mappings, class_name: 'ZaloPersonal::MessageMapping', foreign_key: :zalo_personal_thread_id, dependent: :destroy

  enum :thread_type, {
    direct: 0,
    group: 1
  }, prefix: :thread

  validates :provider_thread_id, presence: true
  validates :thread_type, presence: true

  def direct?
    thread_direct?
  end

  def group?
    thread_group?
  end
end
