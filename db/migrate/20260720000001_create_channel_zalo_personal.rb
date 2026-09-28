# frozen_string_literal: true

class CreateChannelZaloPersonal < ActiveRecord::Migration[7.1]
  def change
    create_table :channel_zalo_personal do |t|
      t.bigint :account_id, null: false
      t.string :identifier, null: false
      t.string :bridge_session_id
      t.string :zalo_user_id
      t.string :display_name
      t.string :avatar_url
      t.integer :connection_status, null: false, default: 0
      t.boolean :enabled, null: false, default: true
      t.bigint :session_generation, null: false, default: 0
      t.datetime :last_connected_at
      t.datetime :last_event_at
      t.datetime :last_heartbeat_at
      t.jsonb :capabilities, null: false, default: {}
      t.jsonb :provider_metadata, null: false, default: {}
      t.text :signing_secret, null: false

      t.timestamps
    end

    add_index :channel_zalo_personal, :identifier, unique: true
    add_index :channel_zalo_personal, :bridge_session_id, unique: true, where: 'bridge_session_id IS NOT NULL'
    add_index :channel_zalo_personal, :zalo_user_id, unique: true, where: 'enabled = true AND zalo_user_id IS NOT NULL'
    add_index :channel_zalo_personal, [:account_id, :connection_status]
    add_index :channel_zalo_personal, :last_heartbeat_at
    add_foreign_key :channel_zalo_personal, :accounts, on_delete: :cascade
  end
end
