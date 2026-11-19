# frozen_string_literal: true

require 'rails_helper'

# Campaign rows of the Báo cáo funnel (ADR-027): a broadcast reuses old conversations, so its row counts the customers who
# wrote back after the send (= campaign results replied_count) and the orders of the 7 days after it. Ad UTM attribution of
# the same conversation is kept on its own row; label rows have no window.
RSpec.describe Kchat::MarketingReports do
  let(:account) { create(:account, name: 'Kalo Candles') }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:inbox) { create(:inbox, account: account, channel: create(:channel_widget, account: account)) }
  let(:now) { Time.utc(2026, 11, 16, 5, 0) }
  let(:contact) { create(:contact, account: account, name: 'Chị Lan') }
  let(:contact_inbox) { create(:contact_inbox, contact: contact, inbox: inbox, source_id: SecureRandom.uuid) }

  before { travel_to(now) }

  def conversation(created_at:, **attrs)
    create(:conversation, account: account, inbox: inbox, contact: contact, contact_inbox: contact_inbox, created_at: created_at, **attrs)
  end

  def incoming(chat, at:)
    create(:message, account: account, inbox: inbox, conversation: chat, sender: contact, message_type: :incoming, created_at: at)
  end

  def order(chat, price:, at: now)
    travel_to(at)
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'chat', payment_method: 'cash', conversation: chat },
                                    items: [{ name: 'Nến', unit_price: price, quantity: 1 }]).tap { travel_to(now) }
  end

  def send_campaign(at:)
    travel_to(at)
    service = Kchat::BroadcastsService.new(account)
    record = service.create_broadcast!(user: admin, params: { title: 'Ra mắt', message: 'Chào {{name}}', inbox_id: inbox.id })
    service.execute_broadcast!(record['id'])
    travel_to(now)
    service.find!(record['id'])
  end

  def campaigns(range = 'today')
    described_class.new(account, range).funnel[:campaigns]
  end

  it 'counts a 30-day-old conversation that wrote back after the campaign, like the campaign results' do
    old = conversation(created_at: now - 30.days)
    incoming(old, at: now - 30.days)
    broadcast = send_campaign(at: now - 2.hours)
    incoming(old, at: now - 1.hour)
    order(old, price: 200_000)

    expect(campaigns).to eq([{ campaign: broadcast['campaign_tag'], source: 'broadcast', conversations: 1, orders: 1,
                               conversion_pct: 100.0, revenue: 200_000 }])
    expect(Kchat::BroadcastsService.new(account).results(broadcast['id'])[:results]).to include(replied_count: 1, orders_count: 1,
                                                                                                revenue: 200_000)
  end

  it 'does not count a reply written before the campaign as a campaign lead' do
    old = conversation(created_at: now - 30.days)
    incoming(old, at: now - 3.hours)
    send_campaign(at: now - 2.hours)

    expect(campaigns).to eq([])
  end

  it 'keeps the ad UTM of a conversation the campaign reached, and splits its orders by the campaign window' do
    ad = conversation(created_at: now - 4.hours, additional_attributes: { 'utm_source' => 'facebook_ads', 'utm_campaign' => 'tet_2027' })
    incoming(ad, at: now - 4.hours)
    order(ad, price: 100_000, at: now - 3.hours)
    broadcast = send_campaign(at: now - 2.hours)
    incoming(ad, at: now - 1.hour)
    order(ad, price: 200_000)

    expect(ad.reload.additional_attributes).to include('utm_source' => 'facebook_ads', 'utm_campaign' => 'tet_2027',
                                                       'kchat_broadcast_tag' => broadcast['campaign_tag'])
    expect(ad.additional_attributes['kchat_campaign_at']).to be_present
    expect(campaigns).to contain_exactly(
      { campaign: 'tet_2027', source: 'facebook_ads', conversations: 1, orders: 1, conversion_pct: 100.0, revenue: 100_000 },
      { campaign: broadcast['campaign_tag'], source: 'broadcast', conversations: 1, orders: 1, conversion_pct: 100.0, revenue: 200_000 }
    )
  end

  it 'applies the 7-day window to UTM rows but not to label rows' do
    utm = conversation(created_at: now - 10.days, additional_attributes: { 'utm_source' => 'facebook_ads', 'utm_campaign' => 'tet_2027' })
    labelled = conversation(created_at: now - 10.days)
    labelled.add_labels(['khach_si'])
    [utm, labelled].each do |chat|
      incoming(chat, at: now - 10.days)
      order(chat, price: 100_000)
    end

    expect(campaigns('month')).to contain_exactly(
      { campaign: 'tet_2027', source: 'facebook_ads', conversations: 1, orders: 0, conversion_pct: 0.0, revenue: 0 },
      { campaign: 'khach_si', source: 'web_widget', conversations: 1, orders: 1, conversion_pct: 100.0, revenue: 100_000 }
    )
  end

  it 'sends into the latest conversation the customer wrote in, not a newer one only the shop wrote in' do
    chatted = conversation(created_at: now - 3.days)
    incoming(chatted, at: now - 3.days)
    outbound = conversation(created_at: now - 1.day)
    send_campaign(at: now - 1.hour)

    expect(chatted.messages.outgoing.count).to eq(1)
    expect(outbound.messages.outgoing.count).to eq(0)
  end
end
