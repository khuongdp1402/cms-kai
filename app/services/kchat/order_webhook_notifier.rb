# frozen_string_literal: true

# Sends pre-order / order lifecycle events to external POS/ERP webhooks configured on the account.
class Kchat::OrderWebhookNotifier
  def self.notify(order, event_name)
    new(order, event_name).perform
  end

  def initialize(order, event_name)
    @order = order
    @event_name = event_name.to_s
  end

  def perform
    account = @order.account
    return unless account&.api_and_webhooks_enabled?

    webhooks = account.webhooks.account_type.select { |hook| hook.subscriptions.include?(@event_name) }
    return if webhooks.empty?

    payload = build_payload
    webhooks.each do |webhook|
      WebhookJob.perform_later(webhook.url, payload, :account_webhook,
                               secret: webhook.secret, delivery_id: SecureRandom.uuid)
    end
  end

  private

  def build_payload
    {
      event: @event_name,
      account_id: @order.account_id,
      order: order_data
    }
  end

  def order_data
    {
      id: @order.id, number: @order.number, status: @order.status, delivery_status: @order.delivery_status,
      source: @order.source, payment_method: @order.payment_method,
      subtotal: @order.subtotal, shipping_fee: @order.shipping_fee, total: @order.total,
      deposit_amount: @order.deposit_amount, payable_amount: @order.payable_amount,
      note: @order.note, shipping_address: @order.shipping_address,
      shipping_carrier: @order.shipping_carrier, tracking_code: @order.tracking_code,
      external_id: @order.external_id, external_source: @order.external_source, external_status: @order.external_status,
      paid_at: @order.paid_at&.iso8601, created_at: @order.created_at&.iso8601,
      contact: contact_data, items: items_data
    }
  end

  def contact_data
    return nil unless @order.contact

    { id: @order.contact.id, name: @order.contact.name,
      phone_number: @order.contact.phone_number, email: @order.contact.email }
  end

  def items_data
    @order.items.includes(:product).sort_by(&:id).map do |item|
      { id: item.id, product_id: item.product_id, sku: item.product&.sku, external_id: item.product&.external_id,
        name: item.name, unit_price: item.unit_price, quantity: item.quantity }
    end
  end
end
