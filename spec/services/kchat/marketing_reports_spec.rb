# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::MarketingReports do
  let(:account) { create(:account, reporting_timezone: 'Asia/Ho_Chi_Minh') }
  let(:second_account) { create(:account, name: 'Shop 2') }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent, name: 'Minh Anh') }
  let(:now) { Time.utc(2026, 11, 16, 5, 0) }

  around { |ex| travel_to(now) { ex.run } }

  before do
    create(:account_user, account: second_account, user: user, role: :agent)
    stub_request(:post, /graph\.facebook\.com/).to_return(status: 200, body: '{}')
  end

  def customer_wrote(conversation)
    create(:message, account: account, inbox: conversation.inbox, conversation: conversation, sender: conversation.contact,
                     message_type: :incoming)
    conversation
  end

  def seed_conversations
    fb_inbox = create(:channel_facebook_page, account: account).inbox.tap { |inbox| inbox.update!(account: account) }
    zalo_inbox = create(:inbox, account: account, channel: create(:channel_zalo_personal, account: account))
    contact = create(:contact, account: account)

    conv1 = create(:conversation, account: account, inbox: fb_inbox, contact: contact,
                                  contact_inbox: create(:contact_inbox, contact: contact, inbox: fb_inbox), assignee: agent,
                                  additional_attributes: { 'referer' => 'https://shop.vn/nen?utm_source=facebook_ads&utm_campaign=tet_2027' })
    customer_wrote(create(:conversation, account: account, inbox: fb_inbox, contact: contact,
                                         contact_inbox: create(:contact_inbox, contact: contact, inbox: fb_inbox),
                                         additional_attributes: { 'utm_source' => 'facebook_ads', 'utm_campaign' => 'tet_2027' }))
    customer_wrote(create(:conversation, account: account, inbox: zalo_inbox, contact: contact,
                                         contact_inbox: create(:contact_inbox, contact: contact, inbox: zalo_inbox)))
    [contact, customer_wrote(conv1)]
  end

  def seed_funnel_data
    contact, conv1 = seed_conversations
    Kchat::Order.create_with_items!(account: account,
                                    attributes: { source: 'chat', payment_method: 'cash', conversation: conv1, contact: contact },
                                    items: [{ name: 'Nến', unit_price: 500_000, quantity: 1 }])
    Kchat::Order.create_with_items!(account: second_account, attributes: { source: 'manual', payment_method: 'cash' },
                                    items: [{ name: 'Tinh dầu', unit_price: 200_000, quantity: 1 }])
  end

  it 'aggregates channel funnel, UTM campaign attribution, agent leaderboard and cross-brand overview' do
    seed_funnel_data
    funnel = described_class.new(account, 'today').funnel
    expect(funnel[:totals]).to eq(conversations_count: 3, converted_conversations_count: 1, orders_count: 1, counter_orders_count: 0,
                                  conversion_pct: 33.3, revenue: 500_000, avg_order_value: 500_000)
    expect(funnel[:channel_funnel].find { |r| r[:channel] == 'facebook_page' }).to eq(
      channel: 'facebook_page', chat: true, conversations: 2, converted_conversations: 1, orders: 1, conversion_pct: 50.0,
      revenue: 500_000, avg_order_value: 500_000
    )
    expect(funnel[:campaigns].first).to eq(
      campaign: 'tet_2027', source: 'facebook_ads', conversations: 2, orders: 1, conversion_pct: 50.0, revenue: 500_000
    )
    expect(funnel[:agents].first).to eq(agent_id: agent.id, name: 'Minh Anh', conversations: 1, orders: 1, conversion_pct: 100.0, revenue: 500_000)

    overview = described_class.brands_overview(user: user, range: 'today')
    expect(overview[:brands].map { |b| [b[:name], b[:revenue]] }).to include([account.name, 500_000], ['Shop 2', 200_000])
  end

  it 'reported case: overall close rate matches the rows and the POS sale is a separate row without a rate' do
    inbox = create(:inbox, account: account)
    contact = create(:contact, account: account)
    chat = customer_wrote(create(:conversation, account: account, inbox: inbox, contact: contact,
                                                contact_inbox: create(:contact_inbox, contact: contact, inbox: inbox)))
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'chat', payment_method: 'transfer_qr', conversation: chat },
                                    items: [{ name: 'Nến', unit_price: 150_000, quantity: 1 }])
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'pos', payment_method: 'cash' },
                                    items: [{ name: 'Nến', unit_price: 90_000, quantity: 1 }])

    funnel = described_class.new(account, 'today').funnel
    expect(funnel[:totals]).to eq(conversations_count: 1, converted_conversations_count: 1, orders_count: 1, counter_orders_count: 1,
                                  conversion_pct: 100.0, revenue: 90_000, avg_order_value: 90_000)
    expect(funnel[:channel_funnel]).to eq(
      [
        { channel: 'web_widget', chat: true, conversations: 1, converted_conversations: 1, orders: 1, conversion_pct: 100.0,
          revenue: 0, avg_order_value: 0 },
        { channel: 'pos', chat: false, conversations: 0, converted_conversations: 0, orders: 1, conversion_pct: nil,
          revenue: 90_000, avg_order_value: 90_000 }
      ]
    )
  end
end
