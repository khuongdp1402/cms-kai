# frozen_string_literal: true

class CreateZaloPersonalWebhookEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :zalo_personal_webhook_events do |t|
      t.bigint :zalo_personal_channel_id, null: false
      t.string :event_id, null: false
      t.string :event_type, null: false
      t.string :thread_id
      t.bigint :sequence
      t.string :provider_message_id
      t.text :payload, null: false
      t.string :payload_sha256, null: false
      t.integer :status, null: false, default: 0
      t.datetime :occurred_at, null: false
      t.datetime :processed_at
      t.string :error_code

      t.timestamps
    end

    add_index :zalo_personal_webhook_events, [:zalo_personal_channel_id, :event_id], unique: true, name: 'idx_zalo_webhook_events_channel_event_id'
    add_index :zalo_personal_webhook_events, [:zalo_personal_channel_id, :thread_id, :sequence], name: 'idx_zalo_webhook_events_channel_thread_seq'
    add_index :zalo_personal_webhook_events, [:status, :created_at]
    add_index :zalo_personal_webhook_events, [:zalo_personal_channel_id, :provider_message_id], name: 'idx_zalo_webhook_events_channel_provider_msg_id'
    add_foreign_key :zalo_personal_webhook_events, :channel_zalo_personal, column: :zalo_personal_channel_id, on_delete: :cascade
  end
end
