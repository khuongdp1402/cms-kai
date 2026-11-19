# frozen_string_literal: true

require 'rails_helper'

# Final QA scenario (LESSONS B12/B105): 1 real website chat that ordered before the campaign, 3 anonymous website visitors,
# 1 POS sale, then a campaign sent to "Mọi khách đã nhắn shop". Every page must report the same, exact numbers.
RSpec.describe Kchat::Metrics do
  let(:account) { create(:account, name: 'Kalo Candles') }
  let(:agent) { create(:user, account: account, role: :administrator, name: 'Minh Anh') }
  let(:widget_inbox) { create(:inbox, account: account, channel: create(:channel_widget, account: account)) }
  let(:now) { Time.utc(2026, 11, 16, 5, 0) } # 12:00 in Ho Chi Minh
  let(:lan) { create(:contact, account: account, name: 'Chị Lan') }
  let(:chat) do
    ci = create(:contact_inbox, contact: lan, inbox: widget_inbox, source_id: SecureRandom.uuid)
    create(:conversation, account: account, inbox: widget_inbox, contact: lan, contact_inbox: ci, assignee: agent, created_at: now - 3.hours)
  end

  # Non-block travel_to: the seed moves the clock forward step by step (nested block travel_to raises in Rails 7.1).
  before do
    travel_to(now - 3.hours)
    chat
  end

  def message(type, at:, sender:)
    create(:message, account: account, inbox: widget_inbox, conversation: chat, sender: sender, message_type: type,
                     content: type == :incoming ? 'Còn nến không?' : 'Dạ còn ạ', created_at: at)
  end

  def order(source:, method:, conversation: nil, price: 150_000)
    Kchat::Order.create_with_items!(account: account, attributes: { source: source, payment_method: method, conversation: conversation,
                                                                    contact: conversation&.contact },
                                    items: [{ name: 'Nến', unit_price: price, quantity: 1 }])
  end

  def seed
    seed_before_campaign
    travel_to(now - 1.hour)
    record = send_campaign
    travel_to(now)
    record
  end

  def seed_before_campaign
    message(:incoming, at: now - 3.hours, sender: lan)
    message(:outgoing, at: now - 3.hours + 2.minutes, sender: agent) # first reply after 120 s
    travel_to(now - 2.hours)
    order(source: 'chat', method: 'transfer_qr', conversation: chat)
    3.times { |i| anonymous_visitor("lingering-grass-#{i}") }
    travel_to(now - 90.minutes)
    order(source: 'pos', method: 'cash', price: 90_000)
  end

  # What the website widget creates for a visitor who never writes: a contact with a generated name and a contact inbox.
  def anonymous_visitor(name)
    create(:contact_inbox, contact: create(:contact, account: account, name: name), inbox: widget_inbox, source_id: SecureRandom.uuid)
  end

  def send_campaign
    service = Kchat::BroadcastsService.new(account)
    record = service.create_broadcast!(user: agent, params: { title: 'Ra mắt', message: 'Chào {{name}}', inbox_id: widget_inbox.id })
    service.execute_broadcast!(record['id'])
    service.find!(record['id'])
  end

  it 'reports the same exact numbers on Tổng quan and Báo cáo' do
    expect(seed).to include('eligible_count' => 1, 'sent_count' => 1)

    metrics = described_class.new(account, 'today')
    expect(metrics.totals).to eq(
      revenue: 90_000, paid_orders_count: 1, avg_order_value: 90_000,
      new_orders_count: 2, chat_orders_count: 1, counter_orders_count: 1,
      chat_conversations_count: 1, converted_conversations_count: 1, chat_conversion_pct: 100.0
    )
    expect(metrics.new_customers_count).to eq(1)
    expect(Kchat::Reports.new(account, 'today').summary).to include(new_contacts: 1, new_orders_count: 2, revenue: 90_000)
    kpis = Kchat::QualityOverviewReport.new(account, 'today').summary[:kpis]
    expect(kpis).to include(conversations_count: 1, conversations_with_orders: 1, chat_orders_count: 1, chat_to_order_cvr_pct: 100.0,
                            avg_first_response_seconds: 120, sla_under_5m_pct: 100.0)
  end

  it 'gives the website row, the agent table, the UTM table and the campaign results the same base' do
    broadcast = seed
    funnel = Kchat::MarketingReports.new(account, 'today').funnel
    web_row = funnel[:channel_funnel].find { |row| row[:channel] == 'web_widget' }
    expect(web_row).to include(conversations: 1, converted_conversations: 1, orders: 1, conversion_pct: 100.0)
    expect(funnel[:agents]).to eq([{ agent_id: agent.id, name: 'Minh Anh', conversations: 1, orders: 1, conversion_pct: 100.0, revenue: 0 }])
    # The order came before the campaign: neither the UTM table nor the campaign results credit it.
    expect(funnel[:campaigns]).to eq([{ campaign: broadcast['campaign_tag'], source: 'broadcast', conversations: 1, orders: 0,
                                        conversion_pct: 0.0, revenue: 0 }])
    expect(Kchat::BroadcastsService.new(account).results(broadcast['id'])[:results]).to include(orders_count: 0, revenue: 0)
  end

  it 'credits an order placed after the campaign in both the UTM table and the campaign results, not after 7 days' do
    broadcast = seed
    message(:incoming, at: now - 30.minutes, sender: lan)
    order(source: 'chat', method: 'cash', conversation: chat, price: 200_000)

    campaign = Kchat::MarketingReports.new(account, 'today').funnel[:campaigns].first
    expect(campaign).to eq(campaign: broadcast['campaign_tag'], source: 'broadcast', conversations: 1, orders: 1, conversion_pct: 100.0,
                           revenue: 200_000)
    expect(Kchat::BroadcastsService.new(account).results(broadcast['id'])[:results]).to include(orders_count: 1, revenue: 200_000)

    travel 8.days do
      order(source: 'chat', method: 'cash', conversation: chat, price: 50_000)
      late = Kchat::MarketingReports.new(account, 'today').funnel[:campaigns]
      expect(late.sum { |row| row[:orders] }).to eq(0)
      expect(Kchat::BroadcastsService.new(account).results(broadcast['id'])[:results]).to include(orders_count: 1)
    end
  end

  it 'does not count a conversation the shop started (no customer message) as "Khách nhắn"' do
    seed
    visitor = account.contacts.find_by(name: 'lingering-grass-0')
    ci = visitor.contact_inboxes.first
    create(:conversation, account: account, inbox: widget_inbox, contact: visitor, contact_inbox: ci).tap do |outbound|
      create(:message, account: account, inbox: widget_inbox, conversation: outbound, sender: agent, message_type: :outgoing, content: 'Chào')
    end

    expect(described_class.new(account, 'today').totals).to include(chat_conversations_count: 1)
    expect(described_class.new(account, 'today').new_customers_count).to eq(1)
  end

  it 'counts a contact created in the period who only bought (POS with a customer) as a new customer' do
    buyer = create(:contact, account: account, name: 'Khách quầy')
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'pos', payment_method: 'cash', contact: buyer },
                                    items: [{ name: 'Nến', unit_price: 90_000, quantity: 1 }])
    create(:contact, account: account, name: 'misty-dawn-1')

    expect(described_class.new(account, 'today').new_customers_count).to eq(1)
  end
end
