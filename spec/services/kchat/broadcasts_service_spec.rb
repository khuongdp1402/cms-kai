# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::BroadcastsService do
  let(:account) { create(:account, name: 'Kalo Candles') }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:service) { described_class.new(account) }

  before do
    stub_request(:post, /graph\.facebook\.com/).to_return(status: 200, body: '{}')
  end

  def make_contact_with_inbox(inbox:, name:, label: nil, incoming_at: nil)
    contact = create(:contact, account: account, name: name)
    contact.add_labels([label]) if label.present?
    ci = create(:contact_inbox, contact: contact, inbox: inbox, source_id: "src_#{contact.id}_#{inbox.id}")
    if incoming_at
      conv = create(:conversation, account: account, inbox: inbox, contact: contact, contact_inbox: ci)
      create(:message, account: account, inbox: inbox, conversation: conv, sender: contact, message_type: :incoming,
                       content: 'hi', created_at: incoming_at)
    end
    ci
  end

  it 'enforces 24h messaging window on Meta channels and respects label filter' do
    fb_channel = create(:channel_facebook_page, account: account)
    fb_inbox = fb_channel.inbox.tap { |inbox| inbox.update!(account: account) }

    make_contact_with_inbox(inbox: fb_inbox, name: 'VIP In 24h', label: 'vip', incoming_at: 2.hours.ago)
    make_contact_with_inbox(inbox: fb_inbox, name: 'VIP Stale 48h', label: 'vip', incoming_at: 48.hours.ago)
    make_contact_with_inbox(inbox: fb_inbox, name: 'Non-VIP', label: 'regular', incoming_at: 1.hour.ago)

    preview = service.preview(inbox_id: fb_inbox.id, labels: ['vip'])
    expect(preview[:requires_24h_window]).to be(true)
    expect(preview[:eligible_count]).to eq(1)
    expect(preview[:skipped_24h_count]).to eq(1)
  end

  it 'does not restrict Zalo Personal by 24h window unless explicitly requested' do
    zalo_channel = create(:channel_zalo_personal, account: account)
    zalo_inbox = create(:inbox, account: account, channel: zalo_channel)

    make_contact_with_inbox(inbox: zalo_inbox, name: 'Minh Thư', label: 'vip', incoming_at: 10.days.ago)
    make_contact_with_inbox(inbox: zalo_inbox, name: 'Quốc Bảo', label: 'vip', incoming_at: 30.days.ago)

    preview = service.preview(inbox_id: zalo_inbox.id, labels: ['vip'])
    expect(preview[:requires_24h_window]).to be(false)
    expect(preview[:eligible_count]).to eq(2)
  end

  it 'personalizes {{name}}/{{shop_name}} and tags broadcast conversations' do
    zalo_channel = create(:channel_zalo_personal, account: account)
    zalo_inbox = create(:inbox, account: account, channel: zalo_channel)
    ci1 = make_contact_with_inbox(inbox: zalo_inbox, name: 'Minh Thư', label: 'vip', incoming_at: 10.days.ago)
    ci2 = make_contact_with_inbox(inbox: zalo_inbox, name: 'Quốc Bảo', label: 'vip', incoming_at: 30.days.ago)

    record = service.create_broadcast!(
      user: admin,
      params: { title: 'Ưu đãi Tết 2027', inbox_id: zalo_inbox.id, labels: ['vip'],
                message: 'Chào {{name}}, {{shop_name}} tặng bạn mã giảm 20%!' }
    )
    service.execute_broadcast!(record['id'])

    updated = service.list.first
    expect(updated).to include('status' => 'completed', 'sent_count' => 2, 'failed_count' => 0)
    expect(ci1.conversations.last.messages.outgoing.last.content).to eq('Chào Minh Thư, Kalo Candles tặng bạn mã giảm 20%!')
    expect(ci2.conversations.last.messages.outgoing.last.content).to eq('Chào Quốc Bảo, Kalo Candles tặng bạn mã giảm 20%!')
    expect(ci1.conversations.last.additional_attributes).to include('utm_source' => 'broadcast', 'utm_campaign' => 'uu_dai_tet_2027')
    expect(ci1.conversations.last.label_list).to include('uu_dai_tet_2027')
  end
end
