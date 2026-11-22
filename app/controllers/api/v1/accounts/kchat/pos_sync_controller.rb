# frozen_string_literal: true

# Inbound POS / external sales sync API: lets connected POS systems push catalog updates and
# real-time order fulfillment statuses into Kalo so CSKH & sales reps see accurate order states.
class Api::V1::Accounts::Kchat::PosSyncController < Api::V1::Accounts::Kchat::BaseController
  before_action :check_admin_authorization?
  before_action :require_active_subscription!

  def products
    rows = Array(params[:products]).map { |p| p.permit(*product_keys).to_h }
    result = ::Kchat::ProductImportService.new(Current.account).call(csv_text: params[:csv_text], products: rows.presence)
    render json: result
  rescue ArgumentError => e
    render_kchat_error(e.message == 'limit_exceeded' ? 'import_limit_exceeded' : 'validation_failed', :unprocessable_entity)
  end

  def orders
    list = params[:orders].is_a?(Array) ? params[:orders] : [params]
    synced = []
    errors = []

    list.first(200).each_with_index do |entry, idx|
      synced << sync_one_order(entry)
    rescue ActiveRecord::RecordInvalid, ::Kchat::Order::InsufficientStock => e
      errors << { index: idx, message: e.message }
    end

    render json: { synced_count: synced.size, errors: errors, orders: synced.map { |o| serialize_order(o) } }
  end

  private

  def product_keys
    %i[name sku price availability_mode stock category description pitch_template external_id image_url image_remote_url]
  end

  def sync_one_order(raw)
    order = find_existing_order(raw)
    return update_existing_order(order, raw) if order

    create_external_order(raw)
  end

  def find_existing_order(raw)
    ext_id = raw[:external_id].to_s.strip
    if ext_id.present?
      match = ::Kchat::Order.find_by(account_id: Current.account.id, external_id: ext_id)
      return match if match
    end
    return ::Kchat::Order.find_by(account_id: Current.account.id, number: raw[:number].to_i) if raw[:number].present?

    nil
  end

  def update_existing_order(order, raw)
    attrs = raw.permit(:external_id, :external_source, :external_status, :shipping_carrier, :tracking_code,
                       :shipping_address, :note, :paid_at).to_h.compact_blank
    status = raw[:status].to_s
    attrs['status'] = status if ::Kchat::Order.statuses.key?(status)
    attrs['paid_at'] ||= Time.current if ::Kchat::Metrics::PAID_STATUSES.include?(status) && order.paid_at.nil?
    order.update!(attrs)
    order
  end

  def create_external_order(raw)
    contact = resolve_contact(raw[:customer])
    order = ::Kchat::Order.create_with_items!(
      account: Current.account,
      attributes: external_order_attrs(raw, contact),
      items: resolve_items(raw[:items])
    )
    apply_post_create_fields(order, raw)
    order
  end

  def external_order_attrs(raw, contact)
    payment_method = raw[:payment_method].to_s
    payment_method = 'transfer_qr' unless ::Kchat::Order.payment_methods.key?(payment_method)
    raw.permit(:shipping_address, :shipping_fee, :note, :deposit_amount,
               :shipping_carrier, :tracking_code, :external_id, :external_source, :external_status)
       .to_h.merge(source: 'external', payment_method: payment_method, contact: contact)
  end

  def apply_post_create_fields(order, raw)
    status = raw[:status].to_s
    updates = {}
    updates[:status] = status if ::Kchat::Order.statuses.key?(status)
    updates[:paid_at] = raw[:paid_at].presence || Time.current if ::Kchat::Metrics::PAID_STATUSES.include?(status) && order.paid_at.nil?
    order.update!(updates) if updates.any?
  end

  def resolve_items(raw_items)
    products_by_ext = ::Kchat::Product.where(account_id: Current.account.id, external_id: Array(raw_items).filter_map { |i| i[:external_id] })
                                      .index_by(&:external_id)
    Array(raw_items).map do |item|
      product = item[:external_id].present? ? products_by_ext[item[:external_id].to_s] : nil
      {
        product_id: item[:product_id].presence || product&.id,
        name: item[:name],
        unit_price: item[:unit_price],
        quantity: item[:quantity] || 1
      }
    end
  end

  def resolve_contact(customer)
    return nil if customer.blank?

    phone = customer[:phone_number].presence || customer[:phone].presence
    email = customer[:email].presence
    name = customer[:name].presence
    contact = find_contact(phone, email)
    return contact if contact

    Current.account.contacts.create!(name: name || phone || email || 'Khách POS', phone_number: phone, email: email)
  end

  def find_contact(phone, email)
    scope = Current.account.contacts
    (phone && scope.find_by(phone_number: phone)) || (email && scope.from_email(email))
  end

  def serialize_order(order)
    { id: order.id, number: order.number, status: order.status, source: order.source,
      external_id: order.external_id, external_status: order.external_status }
  end
end
