# frozen_string_literal: true

class CreateZaloPersonalConnectionAttempts < ActiveRecord::Migration[7.1]
  def change
    create_table :zalo_personal_connection_attempts do |t|
      t.bigint :account_id, null: false
      t.bigint :requested_by_id, null: false
      t.bigint :target_inbox_id
      t.string :public_id, null: false
      t.integer :purpose, null: false
      t.string :bridge_session_id
      t.integer :status, null: false, default: 0
      t.jsonb :profile, null: false, default: {}
      t.jsonb :capabilities, null: false, default: {}
      t.text :signing_secret, null: false
      t.datetime :expires_at, null: false
      t.datetime :authenticated_at
      t.datetime :consumed_at
      t.string :error_code

      t.timestamps
    end

    add_index :zalo_personal_connection_attempts, :public_id, unique: true
    add_index :zalo_personal_connection_attempts, :bridge_session_id, unique: true, where: 'bridge_session_id IS NOT NULL'
    add_index :zalo_personal_connection_attempts, [:account_id, :status]
    add_index :zalo_personal_connection_attempts, :expires_at
    add_foreign_key :zalo_personal_connection_attempts, :accounts, on_delete: :cascade
    add_foreign_key :zalo_personal_connection_attempts, :users, column: :requested_by_id, on_delete: :cascade
    add_foreign_key :zalo_personal_connection_attempts, :inboxes, column: :target_inbox_id, on_delete: :nullify
  end
end
