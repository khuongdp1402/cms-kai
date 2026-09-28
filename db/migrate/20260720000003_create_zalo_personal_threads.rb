# frozen_string_literal: true

class CreateZaloPersonalThreads < ActiveRecord::Migration[7.1]
  def change
    create_table :zalo_personal_threads do |t|
      t.bigint :zalo_personal_channel_id, null: false
      t.bigint :contact_inbox_id, null: false
      t.string :provider_thread_id, null: false
      t.integer :thread_type, null: false
      t.string :name
      t.string :avatar_url
      t.integer :member_count
      t.jsonb :provider_metadata, null: false, default: {}
      t.datetime :last_synced_at

      t.timestamps
    end

    add_index :zalo_personal_threads, [:zalo_personal_channel_id, :thread_type, :provider_thread_id], unique: true, name: 'idx_zalo_threads_channel_type_provider_id'
    add_index :zalo_personal_threads, :contact_inbox_id, unique: true
    add_foreign_key :zalo_personal_threads, :channel_zalo_personal, column: :zalo_personal_channel_id, on_delete: :cascade
    add_foreign_key :zalo_personal_threads, :contact_inboxes, on_delete: :cascade
  end
end
