# Enhances Kalo catalog, pre-orders, tagged canned responses, and disables counter POS by default
# on accounts that have never recorded a counter POS order (Direction A).
class EnhanceKchatSalesCatalogAndChatbot < ActiveRecord::Migration[7.1]
  KALO_POS_BIT = 1 << 10

  def up
    change_kchat_products
    change_kchat_orders
    change_canned_responses
    disable_unused_pos_flag
  end

  def down
    remove_index :kchat_orders, [:account_id, :external_id], if_exists: true
    remove_column :canned_responses, :tags, if_exists: true
    remove_columns :kchat_orders, :note, :deposit_amount, :external_id, :external_source, :external_status
    remove_index :kchat_products, [:account_id, :external_id], if_exists: true
    remove_index :kchat_products, [:account_id, :category], if_exists: true
    remove_columns :kchat_products, :availability_mode, :category, :description, :pitch_template, :external_id, :image_remote_url
  end

  private

  def change_kchat_products
    add_column :kchat_products, :availability_mode, :string, null: false, default: 'in_stock'
    add_column :kchat_products, :category, :string
    add_column :kchat_products, :description, :text
    add_column :kchat_products, :pitch_template, :text
    add_column :kchat_products, :external_id, :string
    add_column :kchat_products, :image_remote_url, :string
    add_index :kchat_products, [:account_id, :external_id], unique: true, where: "external_id IS NOT NULL AND external_id <> ''"
    add_index :kchat_products, [:account_id, :category]
  end

  def change_kchat_orders
    add_column :kchat_orders, :note, :text
    add_column :kchat_orders, :deposit_amount, :bigint, null: false, default: 0
    add_column :kchat_orders, :external_id, :string
    add_column :kchat_orders, :external_source, :string
    add_column :kchat_orders, :external_status, :string
    add_index :kchat_orders, [:account_id, :external_id], unique: true, where: "external_id IS NOT NULL AND external_id <> ''"
  end

  def change_canned_responses
    add_column :canned_responses, :tags, :jsonb, null: false, default: []
  end

  def disable_unused_pos_flag
    execute(<<~SQL.squish)
      UPDATE accounts
      SET feature_flags_ext_1 = feature_flags_ext_1 & ~#{KALO_POS_BIT}
      WHERE NOT EXISTS (
        SELECT 1 FROM kchat_orders o WHERE o.account_id = accounts.id AND o.source = 'pos'
      )
    SQL
  end
end
