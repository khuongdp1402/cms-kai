# frozen_string_literal: true

class CreateZaloPersonalMessageMappings < ActiveRecord::Migration[7.1]
  def change
    create_table :zalo_personal_message_mappings do |t|
      t.bigint :zalo_personal_channel_id, null: false
      t.bigint :zalo_personal_thread_id, null: false
      t.bigint :message_id, null: false
      t.uuid :delivery_id, null: false
      t.string :provider_message_id
      t.integer :part_index, null: false
      t.integer :part_kind, null: false
      t.integer :direction, null: false
      t.integer :status, null: false
      t.datetime :provider_timestamp
      t.string :error_code

      t.timestamps
    end

    add_index :zalo_personal_message_mappings, [:zalo_personal_channel_id, :provider_message_id], unique: true, where: 'provider_message_id IS NOT NULL', name: 'idx_zalo_msg_mappings_channel_provider_msg_id'
    add_index :zalo_personal_message_mappings, [:message_id, :delivery_id, :part_index], unique: true, name: 'idx_zalo_msg_mappings_msg_delivery_part'
    add_index :zalo_personal_message_mappings, [:message_id, :status]
    add_index :zalo_personal_message_mappings, [:zalo_personal_thread_id, :provider_timestamp], name: 'idx_zalo_msg_mappings_thread_provider_timestamp'
    add_foreign_key :zalo_personal_message_mappings, :channel_zalo_personal, column: :zalo_personal_channel_id, on_delete: :cascade
    add_foreign_key :zalo_personal_message_mappings, :zalo_personal_threads, column: :zalo_personal_thread_id, on_delete: :cascade
    add_foreign_key :zalo_personal_message_mappings, :messages, on_delete: :cascade
  end
end
