# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::QualityOverviewReport do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:contact) { create(:contact, account: account) }

  it 'computes order KPIs, chat-to-order CVR, SLA, marketing counts, and SKU quality from real records' do
    prod = Kchat::Product.create!(account: account, name: 'Nến trầm', price: 200_000, stock: 2, active: true)
    conv_ok = create(
      :conversation,
      account: account,
      inbox: inbox,
      contact: contact,
      created_at: 10.minutes.ago,
      first_reply_created_at: 8.minutes.ago,
      waiting_since: nil
    )
    create(
      :conversation,
      account: account,
      inbox: inbox,
      contact: contact,
      status: :open,
      created_at: 25.minutes.ago,
      waiting_since: 20.minutes.ago
    )
    Kchat::Order.create_with_items!(
      account: account,
      attributes: { source: 'chat', payment_method: 'cash', conversation_id: conv_ok.id, contact_id: contact.id },
      items: [{ product_id: prod.id, name: prod.name, unit_price: 200_000, quantity: 1 }]
    )
    cancelled = Kchat::Order.create_with_items!(
      account: account,
      attributes: { source: 'chat', payment_method: 'transfer_qr', contact_id: contact.id },
      items: [{ product_id: prod.id, name: prod.name, unit_price: 200_000, quantity: 1 }]
    )
    cancelled.transition!('cancel')

    report = described_class.new(account, '7d').summary

    expect(report[:range]).to eq('7d')
    expect(report[:kpis]).to include(
      revenue: 200_000,
      orders_count: 1,
      aov: 200_000,
      conversations_count: 2,
      conversations_with_orders: 1,
      chat_to_order_cvr_pct: 50.0,
      waiting_over_15m_count: 1,
      sla_under_5m_pct: 100.0
    )
    expect(report[:sku_quality].first).to include(
      product_id: prod.id,
      sold_qty: 1,
      cancelled_qty: 1,
      cancel_rate_pct: 50.0,
      needs_attention: true
    )
    expect(report[:action_queue].pluck(:key)).to include('waiting_over_15m', 'low_stock_products')
  end
end
