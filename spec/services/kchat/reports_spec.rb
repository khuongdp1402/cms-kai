# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::Reports do
  let(:account) { create(:account, reporting_timezone: 'Asia/Ho_Chi_Minh') }
  let(:now) { Time.utc(2026, 11, 16, 5, 0) } # 12:00 on 16 Nov in Ho Chi Minh

  around { |ex| travel_to(now) { ex.run } }

  def order(price:, status: 'paid', paid_at: now, account: self.account, **extra)
    items = extra.delete(:items) || [{ name: 'Dịch vụ', unit_price: price, quantity: 1 }]
    attributes = { source: 'manual', payment_method: extra.delete(:method) || 'transfer_qr', conversation: extra.delete(:conversation) }
    o = Kchat::Order.create_with_items!(account: account, attributes: attributes, items: items)
    o.update_columns(status: status, paid_at: paid_at) # rubocop:disable Rails/SkipsModelValidations
    o
  end

  def summary(range = 'today', acct = account)
    described_class.new(acct, range).summary
  end

  def make_conversation
    inbox = create(:inbox, account: account)
    contact = create(:contact, account: account, created_at: now - 30.days)
    create(:conversation, account: account, inbox: inbox, contact: contact, contact_inbox: create(:contact_inbox, contact: contact, inbox: inbox))
  end

  it 'revenue counts paid, shipping, completed orders by paid_at and ignores pending and cancelled' do
    order(price: 100_000, status: 'paid')
    order(price: 200_000, status: 'shipping')
    order(price: 300_000, status: 'completed')
    order(price: 400_000, status: 'pending_payment', paid_at: nil)
    order(price: 500_000, status: 'cancelled', paid_at: now)
    order(price: 600_000, status: 'paid', paid_at: now - 3.days)
    order(price: 700_000, status: 'paid', account: create(:account))

    result = summary('today')
    expect(result[:revenue]).to eq(600_000)
    expect(result[:orders_count]).to eq(3)
    expect(summary('7d')[:revenue]).to eq(1_200_000)
  end

  it 'uses the account timezone for today' do
    order(price: 1000, paid_at: Time.utc(2026, 11, 15, 18, 0)) # 01:00 on 16 Nov in HCM
    order(price: 2000, paid_at: Time.utc(2026, 11, 15, 16, 59)) # 23:59 on 15 Nov in HCM

    expect(summary('today')[:revenue]).to eq(1000)
  end

  it 'daily has one entry per day of the range, zero-filled' do
    order(price: 1000, paid_at: now - 2.days)
    order(price: 500, paid_at: now - 2.days + 1.minute)

    daily = summary('7d')[:daily]
    expect(daily.pluck(:date)).to eq(%w[2026-11-10 2026-11-11 2026-11-12 2026-11-13 2026-11-14 2026-11-15 2026-11-16])
    expect(daily.pluck(:revenue)).to eq([0, 0, 0, 0, 1500, 0, 0])
    expect(summary('today')[:daily].size).to eq(1)
    expect(summary('month')[:daily].size).to eq(16)
  end

  it 'channels share_pct sums to 100 when there are orders' do
    convo = make_conversation
    3.times { order(price: 1000, conversation: convo) }
    3.times { order(price: 1000, method: 'cash') }
    order(price: 1000, method: 'card')

    channels = summary[:channels]
    expect(channels.sum { |c| c[:share_pct] }).to eq(100)
    expect(channels.sum { |c| c[:orders] }).to eq(7)
    expect(channels.pluck(:channel)).to include('manual')
    expect(summary('today', create(:account))[:channels]).to eq([])
  end

  it 'top products aggregates by product with stock' do
    shirt = Kchat::Product.create!(account: account, name: 'Áo', price: 100_000, stock: 50)
    hat = Kchat::Product.create!(account: account, name: 'Mũ', price: 10_000, stock: nil)
    order(price: 0, items: [{ product_id: shirt.id, quantity: 2 }, { product_id: hat.id, quantity: 1 }])
    order(price: 0, items: [{ product_id: shirt.id, quantity: 1 }])

    top = summary[:top_products]
    expect(top.first).to eq(name: 'Áo', sold: 3, revenue: 300_000, stock: 47)
    expect(top.last).to eq(name: 'Mũ', sold: 1, revenue: 10_000, stock: nil)
  end

  it 'counts new contacts in range and waiting conversations' do
    # "Khách mới" = contacts created in the period who wrote or bought; an anonymous widget visitor is not one.
    writer = create(:contact, account: account, created_at: now - 1.hour)
    writer_inbox = create(:inbox, account: account)
    chat = create(:conversation, account: account, inbox: writer_inbox, contact: writer,
                                 contact_inbox: create(:contact_inbox, contact: writer, inbox: writer_inbox))
    create(:message, account: account, inbox: writer_inbox, conversation: chat, sender: writer, message_type: :incoming)
    chat.update!(waiting_since: nil) # answered: only the conversation below waits
    create(:contact, account: account, name: 'lingering-grass-348', created_at: now - 1.hour)
    create(:contact, account: account, created_at: now - 3.days)
    make_conversation.update!(waiting_since: now - 1.hour)
    make_conversation.update!(waiting_since: nil)

    result = summary
    expect(result[:new_contacts]).to eq(1)
    expect(result[:waiting_messages]).to eq(1)
  end

  it 'runs a constant number of queries regardless of order count' do
    order(price: 1000)
    few = count_queries { summary('month') }
    10.times { order(price: 1000) }
    expect(count_queries { summary('month') }).to eq(few)
  end

  it 'falls back to the default Vietnam timezone for an invalid reporting_timezone instead of failing' do
    account.update_columns(settings: account.settings.merge('reporting_timezone' => 'Mars/Base')) # rubocop:disable Rails/SkipsModelValidations
    order(price: 1000, paid_at: Time.utc(2026, 11, 15, 18, 0)) # 01:00 on 16 Nov in HCM, still 15 Nov in UTC

    expect(summary('today')[:revenue]).to eq(1000)
  end

  it 'uses the default Vietnam timezone when the account has none' do
    plain = create(:account)
    order(price: 1000, account: plain, paid_at: Time.utc(2026, 11, 15, 18, 0)) # 01:00 on 16 Nov in HCM
    order(price: 2000, account: plain, paid_at: Time.utc(2026, 11, 15, 16, 59)) # 23:59 on 15 Nov in HCM

    result = summary('today', plain)
    expect(result[:revenue]).to eq(1000)
    expect(result[:daily]).to eq([{ date: '2026-11-16', revenue: 1000 }])
    expect(result[:today]).to eq('2026-11-16')
  end

  it 'prefers an explicit account timezone over the default' do
    utc = create(:account, reporting_timezone: 'UTC')
    order(price: 1000, account: utc, paid_at: Time.utc(2026, 11, 15, 18, 0)) # 15 Nov in UTC, not today

    expect(summary('today', utc)[:revenue]).to eq(0)
  end

  it 'counts every non-cancelled order created in the period as a new order (reported case: chat QR order + POS sale)' do
    convo = make_conversation
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'chat', payment_method: 'transfer_qr', conversation: convo },
                                    items: [{ name: 'Nến', unit_price: 150_000, quantity: 1 }])
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'pos', payment_method: 'cash' },
                                    items: [{ name: 'Nến', unit_price: 90_000, quantity: 1 }])
    order(price: 1000, status: 'cancelled', paid_at: nil)

    result = summary
    expect(result).to include(new_orders_count: 2, orders_count: 1, revenue: 90_000)
    expect(result[:channels]).to eq([{ channel: 'pos', orders: 1, share_pct: 50 }, { channel: 'web_widget', orders: 1, share_pct: 50 }])
  end

  it 'rejects an unknown range' do
    expect { summary('year') }.to raise_error(ArgumentError)
  end

  def count_queries(&)
    count = 0
    counter = ->(*, payload) { count += 1 unless payload[:name] == 'SCHEMA' || payload[:sql].match?(/SAVEPOINT|\ABEGIN|\ACOMMIT/) }
    ActiveSupport::Notifications.subscribed(counter, 'sql.active_record', &)
    count
  end
end
