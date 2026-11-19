# frozen_string_literal: true

require 'rails_helper'

# One shared definition of every sales/chat metric on Tổng quan and Báo cáo (LESSONS B12: no contradictory numbers).
RSpec.describe Kchat::Metrics do
  let(:account) { create(:account) } # no reporting_timezone: Asia/Ho_Chi_Minh by default
  let(:now) { Time.utc(2026, 11, 16, 5, 0) } # 12:00 on 16 Nov in Ho Chi Minh
  let(:inbox) { create(:inbox, account: account) } # web widget
  let(:contact) { create(:contact, account: account) }

  around { |ex| travel_to(now) { ex.run } }

  # A chat the customer started: "Khách nhắn" only counts conversations with at least one incoming message.
  def conversation(created_at: now - 1.hour, in_inbox: inbox)
    create(:conversation, account: account, inbox: in_inbox, contact: contact, created_at: created_at,
                          contact_inbox: create(:contact_inbox, contact: contact, inbox: in_inbox)).tap do |chat|
      create(:message, account: account, inbox: in_inbox, conversation: chat, sender: contact, message_type: :incoming)
    end
  end

  def order(source:, method:, conversation: nil, price: 150_000)
    Kchat::Order.create_with_items!(account: account, attributes: { source: source, payment_method: method, conversation: conversation },
                                    items: [{ name: 'Nến', unit_price: price, quantity: 1 }])
  end

  # The reported case: 1 website chat that led to a QR order (#1001, not paid yet) + 1 POS cash sale (#1002).
  def seed_reported_case
    chat = conversation
    chat_order = order(source: 'chat', method: 'transfer_qr', conversation: chat, price: 150_000)
    pos_order = order(source: 'pos', method: 'cash', price: 90_000)
    [chat_order, pos_order]
  end

  it 'reproduces the reported case with exact, mutually consistent numbers' do
    chat_order, pos_order = seed_reported_case
    expect([chat_order.number, pos_order.number]).to eq([1001, 1002])

    metrics = described_class.new(account, 'today')
    expect(metrics.totals).to eq(
      revenue: 90_000, paid_orders_count: 1, avg_order_value: 90_000,
      new_orders_count: 2, chat_orders_count: 1, counter_orders_count: 1,
      chat_conversations_count: 1, converted_conversations_count: 1, chat_conversion_pct: 100.0
    )
    expect(metrics.channel_rows).to eq(
      [
        { channel: 'web_widget', chat: true, conversations: 1, converted_conversations: 1, orders: 1, conversion_pct: 100.0,
          revenue: 0, avg_order_value: 0 },
        { channel: 'pos', chat: false, conversations: 0, converted_conversations: 0, orders: 1, conversion_pct: nil,
          revenue: 90_000, avg_order_value: 90_000 }
      ]
    )
  end

  it 'never counts cancelled orders, and counts a converted conversation once however many orders it has' do
    chat = conversation
    2.times { order(source: 'chat', method: 'cash', conversation: chat) }
    order(source: 'chat', method: 'transfer_qr', conversation: conversation).transition!(:cancel)

    totals = described_class.new(account, 'today').totals
    expect(totals).to include(new_orders_count: 2, chat_orders_count: 2, chat_conversations_count: 2,
                              converted_conversations_count: 1, chat_conversion_pct: 50.0, paid_orders_count: 2, revenue: 300_000)
  end

  it 'counts an order on a conversation from before the period as a chat order, not as a converted conversation' do
    old_chat = conversation(created_at: now - 3.days)
    order(source: 'chat', method: 'cash', conversation: old_chat)

    totals = described_class.new(account, 'today').totals
    expect(totals).to include(chat_orders_count: 1, new_orders_count: 1, chat_conversations_count: 0,
                              converted_conversations_count: 0, chat_conversion_pct: 0.0)
    expect(described_class.new(account, '7d').totals).to include(chat_conversations_count: 1, converted_conversations_count: 1,
                                                                 chat_conversion_pct: 100.0)
  end

  it 'counts two orders on one conversation as 2 chat orders but 1 converted conversation (rate stays 100%)' do
    chat = conversation
    order(source: 'chat', method: 'transfer_qr', conversation: chat)
    order(source: 'chat', method: 'cash', conversation: chat)

    metrics = described_class.new(account, 'today')
    expect(metrics.totals).to include(chat_orders_count: 2, chat_conversations_count: 1, converted_conversations_count: 1,
                                      chat_conversion_pct: 100.0)
    expect(metrics.channel_rows.first).to include(channel: 'web_widget', orders: 2, converted_conversations: 1, conversion_pct: 100.0)
  end

  it 'keeps POS and manual orders without a chat out of the chat conversion' do
    conversation
    order(source: 'pos', method: 'card')
    order(source: 'manual', method: 'cod')

    metrics = described_class.new(account, 'today')
    expect(metrics.totals).to include(chat_conversations_count: 1, converted_conversations_count: 0, chat_conversion_pct: 0.0,
                                      chat_orders_count: 0, counter_orders_count: 2, new_orders_count: 2)
    expect(metrics.channel_rows.reject { |row| row[:chat] }.pluck(:channel, :conversion_pct)).to contain_exactly(['pos', nil], ['manual', nil])
  end

  it 'puts chat orders whose conversation was deleted in a separate "chat" row without a rate' do
    chat = conversation
    order(source: 'chat', method: 'cash', conversation: chat)
    chat.destroy!

    metrics = described_class.new(account, 'today')
    expect(metrics.totals).to include(new_orders_count: 1, chat_orders_count: 0, counter_orders_count: 1, chat_conversations_count: 0)
    expect(metrics.channel_rows).to eq(
      [{ channel: 'chat', chat: false, conversations: 0, converted_conversations: 0, orders: 1, conversion_pct: nil,
         revenue: 150_000, avg_order_value: 150_000 }]
    )
  end

  it 'uses Asia/Ho_Chi_Minh day boundaries' do
    conversation(created_at: Time.utc(2026, 11, 15, 16, 59)) # 23:59 on 15 Nov in HCM: yesterday
    conversation(created_at: Time.utc(2026, 11, 15, 17, 1))  # 00:01 on 16 Nov in HCM: today
    early = order(source: 'pos', method: 'cash')
    early.update_columns(created_at: Time.utc(2026, 11, 15, 17, 1), paid_at: Time.utc(2026, 11, 15, 17, 1)) # rubocop:disable Rails/SkipsModelValidations
    late = order(source: 'pos', method: 'cash')
    late.update_columns(created_at: Time.utc(2026, 11, 15, 16, 59), paid_at: Time.utc(2026, 11, 15, 16, 59)) # rubocop:disable Rails/SkipsModelValidations

    today = described_class.new(account, 'today').totals
    expect(today).to include(chat_conversations_count: 1, new_orders_count: 1, paid_orders_count: 1, revenue: 150_000)
    expect(described_class.new(account, '7d').totals).to include(chat_conversations_count: 2, new_orders_count: 2, revenue: 300_000)
  end

  it 'returns zero percentages, not errors, for an empty shop' do
    expect(described_class.new(account, 'month').totals).to include(chat_conversion_pct: 0.0, avg_order_value: 0, new_orders_count: 0)
    expect(described_class.new(account, 'month').channel_rows).to eq([])
  end

  it 'rejects an unknown range' do
    expect { described_class.new(account, 'year') }.to raise_error(ArgumentError)
  end
end
