# frozen_string_literal: true

# == Schema Information
#
# Table name: zalo_personal_thread_participants
#
#  id                      :bigint           not null, primary key
#  zalo_personal_thread_id :bigint           not null
#  contact_id              :bigint           not null
#  provider_user_id        :string           not null
#  display_name            :string
#  avatar_url              :string
#  role                    :string
#  active                  :boolean          default(TRUE), not null
#  provider_metadata       :jsonb            not null
#  last_synced_at          :datetime
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#

class ZaloPersonal::ThreadParticipant < ApplicationRecord
  self.table_name = 'zalo_personal_thread_participants'

  belongs_to :thread, class_name: 'ZaloPersonal::Thread', foreign_key: :zalo_personal_thread_id
  belongs_to :contact

  validates :provider_user_id, presence: true
end
