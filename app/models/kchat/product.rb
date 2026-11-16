# == Schema Information
#
# Table name: kchat_products
#
#  id         :bigint           not null, primary key
#  active     :boolean          default(TRUE), not null
#  name       :string           not null
#  price      :bigint           default(0), not null
#  sku        :string
#  stock      :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint           not null
#
# Indexes
#
#  index_kchat_products_on_account_id             (account_id)
#  index_kchat_products_on_account_id_and_active  (account_id,active)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
class Kchat::Product < ApplicationRecord
  belongs_to :account
  has_one_attached :image
  has_many :order_items, class_name: 'Kchat::OrderItem', dependent: :nullify

  validates :name, presence: true
  validates :price, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :stock, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
end
