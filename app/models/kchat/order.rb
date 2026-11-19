# == Schema Information
#
# Table name: kchat_orders
#
#  id               :bigint           not null, primary key
#  number           :integer          not null
#  paid_at          :datetime
#  payment_method   :string           not null
#  shipping_address :text
#  shipping_carrier :string
#  shipping_fee     :bigint           default(0), not null
#  source           :string           not null
#  status           :string           default("pending_payment"), not null
#  subtotal         :bigint           default(0), not null
#  total            :bigint           default(0), not null
#  tracking_code    :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  account_id       :bigint           not null
#  contact_id       :bigint
#  conversation_id  :bigint
#
# Indexes
#
#  index_kchat_orders_on_account_id              (account_id)
#  index_kchat_orders_on_account_id_and_number   (account_id,number) UNIQUE
#  index_kchat_orders_on_account_id_and_paid_at  (account_id,paid_at)
#  index_kchat_orders_on_account_id_and_status   (account_id,status)
#  index_kchat_orders_on_contact_id              (contact_id)
#  index_kchat_orders_on_conversation_id         (conversation_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (contact_id => contacts.id) ON DELETE => nullify
#  fk_rails_...  (conversation_id => conversations.id) ON DELETE => nullify
#
class Kchat::Order < ApplicationRecord
  MAX_TOTAL = 9_999_999_999
  FIRST_NUMBER = 1001
  # event => { from status => required payment_method (nil = any) }
  TRANSITIONS = {
    mark_paid: { 'pending_payment' => nil },
    ship: { 'paid' => nil, 'pending_payment' => 'cod' },
    complete: { 'shipping' => nil },
    cancel: { 'pending_payment' => nil, 'paid' => nil }
  }.freeze
  TARGET_STATUS = { mark_paid: 'paid', ship: 'shipping', complete: 'completed', cancel: 'cancelled' }.freeze

  class InvalidTransition < StandardError; end

  class InsufficientStock < StandardError
    attr_reader :product_id

    def initialize(product_id)
      @product_id = product_id
      super("insufficient stock for product #{product_id}")
    end
  end

  belongs_to :account
  belongs_to :contact, optional: true
  belongs_to :conversation, optional: true
  has_many :items, class_name: 'Kchat::OrderItem', inverse_of: :order, dependent: :destroy

  enum :status, { pending_payment: 'pending_payment', paid: 'paid', shipping: 'shipping', completed: 'completed', cancelled: 'cancelled' },
       validate: true
  enum :source, { chat: 'chat', pos: 'pos', manual: 'manual' }, prefix: true, validate: true
  enum :payment_method, { transfer_qr: 'transfer_qr', cod: 'cod', cash: 'cash', card: 'card' }, prefix: true, validate: true

  validates :number, presence: true
  validates :items, presence: true
  validates :shipping_fee, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :total, numericality: { only_integer: true, less_than_or_equal_to: MAX_TOTAL }
  validate :contact_and_conversation_belong_to_account
  validate :products_active, on: :create

  PROTECTED_ATTRIBUTES = %i[status paid_at number subtotal total account account_id].freeze

  # Paid orders that still have to be shipped ("Cần giao"). Counter (POS) sales are handed over at the counter.
  scope :awaiting_delivery, -> { where(status: 'paid').where.not(source: 'pos') }

  class << self
    def create_with_items!(account:, attributes:, items:)
      transaction do
        account.with_lock do
          lines = build_lines(account, items)
          order = new(attributes.to_h.symbolize_keys.except(*PROTECTED_ATTRIBUTES).merge(account: account, number: next_number(account)))
          lines.each { |line| order.items.build(line.except(:product)) }
          order.apply_totals
          order.apply_initial_status
          order.save!
          reserve_stock!(lines)
          order
        end
      end
    end

    private

    def next_number(account)
      (where(account_id: account.id).maximum(:number) || (FIRST_NUMBER - 1)) + 1
    end

    def build_lines(account, items)
      products = Kchat::Product.where(account_id: account.id, id: items.filter_map { |i| i[:product_id] }).index_by(&:id)
      items.map { |item| build_line(item, item[:product_id] && products.fetch(item[:product_id].to_i) { raise ActiveRecord::RecordNotFound }) }
    end

    def build_line(item, product)
      quantity = cast_quantity(item[:quantity])
      return { product: product, product_id: product.id, name: product.name, unit_price: product.price, quantity: quantity } if product

      { product: nil, product_id: nil, name: item[:name], unit_price: item[:unit_price], quantity: quantity }
    end

    # nil for anything that is not an integer or an integer string, so item validation reports it
    def cast_quantity(value)
      value.is_a?(Integer) ? value : (Integer(value, 10, exception: false) if value.is_a?(String))
    end

    def wanted_quantities(lines)
      lines.select { |l| l[:product] }.group_by { |l| l[:product].id }.transform_values { |ls| ls.sum { |l| l[:quantity] } }
    end

    def reserve_stock!(lines)
      wanted = wanted_quantities(lines)
      Kchat::Product.where(id: wanted.keys).where.not(stock: nil).order(:id).lock.each do |product|
        raise InsufficientStock, product.id if product.stock < wanted[product.id]

        product.update!(stock: product.stock - wanted[product.id])
      end
    end
  end

  def transition!(event)
    event = event.to_sym
    transaction do
      lock!
      ensure_allowed!(event)
      restore_stock! if event == :cancel
      self.paid_at ||= Time.current if sets_paid_at?(event)
      update!(status: TARGET_STATUS[event])
    end
    self
  end

  # Derived, no column: POS sales never ship, so they are never "Chưa giao" nor counted in delivery KPIs.
  def delivery_status
    return 'cancelled' if cancelled?
    return 'not_applicable' if source_pos?
    return 'shipping' if shipping?
    return 'delivered' if completed?

    'pending'
  end

  def apply_totals
    self.subtotal = items.sum { |i| i.unit_price.to_i * i.quantity.to_i }
    self.total = subtotal + shipping_fee.to_i
  end

  def apply_initial_status
    if payment_method_cash? || payment_method_card?
      self.status = 'paid'
      self.paid_at = Time.current
    else
      self.status = 'pending_payment'
      self.paid_at = nil
    end
  end

  def products_active
    errors.add(:base, 'product_inactive') if items.any? { |i| i.product && !i.product.active }
  end

  def contact_and_conversation_belong_to_account
    errors.add(:base, 'contact_wrong_account') if contact && contact.account_id != account_id
    errors.add(:base, 'conversation_wrong_account') if conversation && conversation.account_id != account_id
  end

  private

  def ensure_allowed!(event)
    return if pos_direct_complete?(event)

    rules = TRANSITIONS.fetch(event) { raise InvalidTransition, "unknown event #{event}" }
    raise InvalidTransition, "cannot #{event} from #{status}" unless rules.key?(status)

    required_method = rules[status]
    raise InvalidTransition, "cannot #{event} a #{payment_method} order" if required_method && payment_method != required_method
  end

  def pos_direct_complete?(event)
    event == :complete && paid? && source_pos?
  end

  def sets_paid_at?(event)
    event == :mark_paid || (event == :complete && payment_method_cod?)
  end

  def restore_stock!
    quantities = items.select(&:product_id).group_by(&:product_id).transform_values { |is| is.sum(&:quantity) }
    Kchat::Product.where(id: quantities.keys).order(:id).lock.each do |product|
      product.update!(stock: product.stock + quantities[product.id]) unless product.stock.nil?
    end
  end
end
