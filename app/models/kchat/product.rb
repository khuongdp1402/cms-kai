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
  IMAGE_CONTENT_TYPES = %w[image/png image/jpeg image/gif image/webp].freeze
  IMAGE_MAX_SIZE = 5.megabytes
  # stock is a 4-byte integer column.
  MAX_STOCK = 2_147_483_647

  belongs_to :account
  has_one_attached :image
  has_many :order_items, class_name: 'Kchat::OrderItem', dependent: :nullify

  validates :name, presence: true
  validates :price, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :acceptable_image, if: -> { image.changed? }
  validates :stock, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: MAX_STOCK }, allow_nil: true

  private

  def acceptable_image
    return unless image.attached?

    errors.add(:image, 'is too big') if image.byte_size > IMAGE_MAX_SIZE
    errors.add(:image, 'filetype not supported') unless IMAGE_CONTENT_TYPES.include?(image.content_type)
  end
end
