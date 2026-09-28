# frozen_string_literal: true

class CreateZaloPersonalThreadParticipants < ActiveRecord::Migration[7.1]
  def change
    create_table :zalo_personal_thread_participants do |t|
      t.bigint :zalo_personal_thread_id, null: false
      t.bigint :contact_id, null: false
      t.string :provider_user_id, null: false
      t.string :display_name
      t.string :avatar_url
      t.string :role
      t.boolean :active, null: false, default: true
      t.jsonb :provider_metadata, null: false, default: {}
      t.datetime :last_synced_at

      t.timestamps
    end

    add_index :zalo_personal_thread_participants, [:zalo_personal_thread_id, :provider_user_id], unique: true, name: 'idx_zalo_participants_thread_provider_user'
    add_index :zalo_personal_thread_participants, :contact_id
    add_foreign_key :zalo_personal_thread_participants, :zalo_personal_threads, column: :zalo_personal_thread_id, on_delete: :cascade
    add_foreign_key :zalo_personal_thread_participants, :contacts, on_delete: :cascade
  end
end
