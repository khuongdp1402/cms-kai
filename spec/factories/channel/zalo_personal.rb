# frozen_string_literal: true

FactoryBot.define do
  factory :channel_zalo_personal, class: 'Channel::ZaloPersonal' do
    account
    identifier { SecureRandom.uuid }
    signing_secret { SecureRandom.hex(32) }
    connection_status { :connected }
    enabled { true }
    display_name { 'Zalo Personal Tester' }
    zalo_user_id { "zalo_uid_#{SecureRandom.hex(4)}" }
  end
end
