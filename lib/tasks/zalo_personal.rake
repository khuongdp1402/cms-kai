# frozen_string_literal: true

namespace :zalo_personal do
  desc 'Migrate legacy Zalo Personal inboxes from Channel::Api to native Channel::ZaloPersonal'
  task migrate_legacy_inboxes: :environment do
    puts 'Starting migration of legacy Zalo Personal inboxes...'

    legacy_inboxes = Inbox.where(channel_type: 'Channel::Api').select do |inbox|
      attrs = inbox.channel.additional_attributes || {}
      attrs['channel'] == 'zalo_personal' || attrs['zalo_type'] == 'personal'
    end

    puts "Found #{legacy_inboxes.count} legacy Zalo Personal inboxes."

    legacy_inboxes.each do |inbox|
      puts "Migrating Inbox ID: #{inbox.id} (#{inbox.name})..."
      ZaloPersonal::MigrateLegacyInboxJob.perform_now(inbox.id)
      puts "Successfully migrated Inbox ID: #{inbox.id}"
    end

    puts 'Migration completed!'
  end
end
