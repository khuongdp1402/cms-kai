# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::QualityOverviewReport do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:contact) { create(:contact, account: account) }
  let(:agent) { create(:user, account: account) }

  def message(conversation, type, at:)
    create(:message, account: account, inbox: inbox, conversation: conversation, message_type: type, created_at: at,
                     sender: type == :incoming ? contact : agent)
  end

  # First response: customer's first message → first staff reply (2 minutes for conv_ok).
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
    ).tap { |conv| [[:incoming, 10], [:outgoing, 8]].each { |type, minutes| message(conv, type, at: minutes.minutes.ago) } }
    create(
      :conversation,
      account: account,
      inbox: inbox,
      contact: contact,
      status: :open,
      created_at: 25.minutes.ago,
      waiting_since: 20.minutes.ago
    ).tap { |waiting| message(waiting, :incoming, at: 25.minutes.ago) }
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

  it 'reports the chat order of the reported case and keeps the POS sale out of the chat conversion' do
    chat = create(:conversation, account: account, inbox: inbox, contact: contact)
    message(chat, :incoming, at: Time.current)
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'chat', payment_method: 'transfer_qr', conversation: chat },
                                    items: [{ name: 'Nến', unit_price: 150_000, quantity: 1 }])
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'pos', payment_method: 'cash' },
                                    items: [{ name: 'Nến', unit_price: 90_000, quantity: 1 }])

    report = described_class.new(account, 'today').summary
    expect(report[:kpis]).to include(revenue: 90_000, orders_count: 1, aov: 90_000, new_orders_count: 2, conversations_count: 1,
                                     conversations_with_orders: 1, chat_orders_count: 1, chat_to_order_cvr_pct: 100.0, pending_qr_count: 1)
    expect(report[:channel_quality]).to eq(
      [
        { channel: 'web_widget', chat: true, conversations_count: 1, orders_count: 1, cvr_pct: 100.0, waiting_over_15m_count: 0 },
        { channel: 'pos', chat: false, conversations_count: 0, orders_count: 1, cvr_pct: nil, waiting_over_15m_count: 0 }
      ]
    )
  end

  it 'sends hidden comments to the Bình luận page (kalo_comments)' do
    conversation = create(:conversation, account: account, inbox: inbox, contact: contact)
    message = create(:message, account: account, inbox: inbox, conversation: conversation)
    # Same write as Kchat::SocialComments::IngestService#hide_comment.
    message.update!(content_attributes: message.content_attributes.merge('comment_hidden' => true))

    item = described_class.new(account, '7d').summary[:action_queue].find { |entry| entry[:key] == 'phones_protected' }

    expect(item).to include(count: 1, route: 'kalo_comments', tone: 'ok')
  end

  it 'ignores preorder products in low_stock_products and routes low stock items to kalo_products' do
    Kchat::Product.create!(account: account, name: 'Hàng có sẵn ít', price: 100_000, stock: 1, availability_mode: 'in_stock')
    Kchat::Product.create!(account: account, name: 'Tour đặt trước', price: 2_000_000, stock: 0, availability_mode: 'preorder')

    item = described_class.new(account, '7d').summary[:action_queue].find { |entry| entry[:key] == 'low_stock_products' }
    expect(item).to include(count: 1, route: 'kalo_products', tone: 'err')
  end
end
