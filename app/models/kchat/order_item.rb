# == Schema Information
#
# Table name: kchat_order_items
#
#  id         :bigint           not null, primary key
#  name       :string           not null
#  quantity   :integer          not null
#  unit_price :bigint           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  order_id   :bigint           not null
#  product_id :bigint
#
# Indexes
#
#  index_kchat_order_items_on_order_id    (order_id)
#  index_kchat_order_items_on_product_id  (product_id)
#
# Foreign Keys
#
#  fk_rails_...  (order_id => kchat_orders.id) ON DELETE => cascade
#  fk_rails_...  (product_id => kchat_products.id) ON DELETE => nullify
#
class Kchat::OrderItem < ApplicationRecord
  belongs_to :order, class_name: 'Kchat::Order'
  belongs_to :product, class_name: 'Kchat::Product', optional: true

  validates :name, presence: true
  validates :unit_price, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :quantity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 100_000 }
end
