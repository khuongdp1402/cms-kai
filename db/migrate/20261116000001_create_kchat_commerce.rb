class CreateKchatCommerce < ActiveRecord::Migration[7.1]
  # rubocop:disable Metrics/AbcSize, Metrics/MethodLength
  def change
    create_table :kchat_products do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false
      t.string :sku
      t.bigint :price, null: false, default: 0
      t.integer :stock
      t.boolean :active, null: false, default: true

      t.timestamps
    end
    add_index :kchat_products, [:account_id, :active]

    create_table :kchat_orders do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.references :contact, foreign_key: { on_delete: :nullify }
      t.references :conversation, foreign_key: { on_delete: :nullify }
      t.integer :number, null: false
      t.string :status, null: false, default: 'pending_payment'
      t.string :source, null: false
      t.string :payment_method, null: false
      t.bigint :subtotal, null: false, default: 0
      t.bigint :shipping_fee, null: false, default: 0
      t.bigint :total, null: false, default: 0
      t.text :shipping_address
      t.string :shipping_carrier
      t.string :tracking_code
      t.datetime :paid_at

      t.timestamps
    end
    add_index :kchat_orders, [:account_id, :number], unique: true
    add_index :kchat_orders, [:account_id, :status]
    add_index :kchat_orders, [:account_id, :paid_at]

    create_table :kchat_order_items do |t|
      t.references :order, null: false, foreign_key: { to_table: :kchat_orders, on_delete: :cascade }
      t.references :product, foreign_key: { to_table: :kchat_products, on_delete: :nullify }
      t.string :name, null: false
      t.bigint :unit_price, null: false
      t.integer :quantity, null: false

      t.timestamps
    end

    create_table :kchat_payment_events do |t|
      t.references :account, foreign_key: { on_delete: :nullify }
      t.string :tid, null: false
      t.bigint :amount, null: false
      t.text :description
      t.string :status, null: false, default: 'unmatched'
      t.jsonb :raw, null: false, default: {}
      t.datetime :received_at, null: false

      t.timestamps
    end
    add_index :kchat_payment_events, :tid, unique: true
    add_index :kchat_payment_events, :status
  end
  # rubocop:enable Metrics/AbcSize, Metrics/MethodLength
end
