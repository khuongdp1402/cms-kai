# == Schema Information
#
# Table name: kchat_products
#
#  id                :bigint           not null, primary key
#  active            :boolean          default(TRUE), not null
#  availability_mode :string           default("in_stock"), not null
#  category          :string
#  description       :text
#  image_remote_url  :string
#  name              :string           not null
#  pitch_template    :text
#  price             :bigint           default(0), not null
#  sku               :string
#  stock             :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  external_id       :string
#
# Indexes
#
#  index_kchat_products_on_account_id                  (account_id)
#  index_kchat_products_on_account_id_and_active       (account_id,active)
#  index_kchat_products_on_account_id_and_category     (account_id,category)
# rubocop:disable Layout/LineLength
#  index_kchat_products_on_account_id_and_external_id  (account_id,external_id) UNIQUE WHERE ((external_id IS NOT NULL) AND ((external_id)::text <> ''::text))
# rubocop:enable Layout/LineLength
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
class Kchat::Product < ApplicationRecord
  IMAGE_CONTENT_TYPES = %w[image/png image/jpeg image/gif image/webp].freeze
  IMAGE_MAX_SIZE = 5.megabytes
  AVAILABILITY_MODES = %w[in_stock preorder custom].freeze
  AVAILABILITY_LABELS = {
    'in_stock' => 'Có sẵn',
    'preorder' => 'Đặt trước / Booking',
    'custom' => 'Theo yêu cầu'
  }.freeze
  # stock is a 4-byte integer column.
  MAX_STOCK = 2_147_483_647

  belongs_to :account
  has_one_attached :image
  has_many :order_items, class_name: 'Kchat::OrderItem', dependent: :nullify

  validates :name, presence: true
  validates :price, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :availability_mode, inclusion: { in: AVAILABILITY_MODES }
  validates :category, length: { maximum: 80 }, allow_blank: true
  validates :description, length: { maximum: 2_000 }, allow_blank: true
  validates :pitch_template, length: { maximum: 2_000 }, allow_blank: true
  validates :external_id, length: { maximum: 120 }, allow_blank: true, uniqueness: { scope: :account_id, allow_blank: true }
  validates :image_remote_url, length: { maximum: 1_000 }, format: URI::DEFAULT_PARSER.make_regexp(%w[http https]), allow_blank: true
  validate :acceptable_image, if: -> { image.changed? }
  validates :stock, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: MAX_STOCK }, allow_nil: true

  def tracks_stock?
    availability_mode == 'in_stock' && !stock.nil?
  end

  def formatted_price
    "#{ActiveSupport::NumberHelper.number_to_delimited(price.to_i, delimiter: '.')}đ"
  end

  def formatted_pitch
    pitch_template.present? ? interpolated_pitch : default_pitch
  end

  private

  def interpolated_pitch
    replacements = {
      '{name}' => name.to_s, '{price}' => formatted_price, '{sku}' => sku.to_s,
      '{category}' => category.to_s, '{description}' => description.to_s
    }
    replacements.reduce(pitch_template) { |text, (key, val)| text.gsub(key, val) }.strip
  end

  def default_pitch
    lines = ["• #{name} — #{formatted_price}"]
    lines << "Nhóm: #{category}" if category.present?
    lines << "Trạng thái: #{AVAILABILITY_LABELS.fetch(availability_mode, availability_mode)}"
    lines << description.to_s.strip if description.present?
    lines.join("\n")
  end

  def acceptable_image
    return unless image.attached?

    errors.add(:image, 'is too big') if image.byte_size > IMAGE_MAX_SIZE
    errors.add(:image, 'filetype not supported') unless IMAGE_CONTENT_TYPES.include?(image.content_type)
  end
end
