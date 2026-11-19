# frozen_string_literal: true

require 'rails_helper'

# "Mọi khách đã nhắn shop" means contacts who wrote to the shop in that inbox. Website visitors the widget created a contact
# for (random name, no message) are not customers: never counted, never messaged, never given a new conversation.
RSpec.describe Kchat::BroadcastsService do
  let(:account) { create(:account, name: 'Kalo Candles') }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:service) { described_class.new(account) }
  let(:widget_inbox) { create(:inbox, account: account, channel: create(:channel_widget, account: account)) }

  # What widget/config does for a new visitor: a contact named by Haikunator and a contact inbox, no conversation.
  def anonymous_visitor(name, with_empty_conversation: false)
    contact = create(:contact, account: account, name: name)
    ci = create(:contact_inbox, contact: contact, inbox: widget_inbox, source_id: SecureRandom.uuid)
    create(:conversation, account: account, inbox: widget_inbox, contact: contact, contact_inbox: ci) if with_empty_conversation
    ci
  end

  def chatting_contact(name, label: nil, email: nil)
    contact = create(:contact, account: account, name: name, email: email)
    contact.add_labels([label]) if label
    ci = create(:contact_inbox, contact: contact, inbox: widget_inbox, source_id: SecureRandom.uuid)
    conversation = create(:conversation, account: account, inbox: widget_inbox, contact: contact, contact_inbox: ci)
    create(:message, account: account, inbox: widget_inbox, conversation: conversation, sender: contact, message_type: :incoming,
                     content: 'Còn nến không shop?')
    ci
  end

  def send_campaign(message = 'Chào {{name}} ơi', **extra)
    record = service.create_broadcast!(user: admin, params: { title: 'Ra mắt', message: message, inbox_id: widget_inbox.id, **extra })
    service.execute_broadcast!(record['id'])
    service.find!(record['id'])
  end

  it 'counts and messages only the contact who wrote to the shop, not the 3 anonymous website visitors' do
    lan = chatting_contact('Chị Lan')
    visitors = [anonymous_visitor('lingering-grass-348'), anonymous_visitor('sparkling-wood-12'),
                anonymous_visitor('quiet-sun-7', with_empty_conversation: true)]

    summary = service.audience_summary
    expect(summary[:audience_count]).to eq(1)
    expect(summary[:channels].find { |row| row[:inbox_id] == widget_inbox.id }).to include(eligible_count: 1, sample_name: 'Chị Lan')

    expect(send_campaign).to include('status' => 'completed', 'eligible_count' => 1, 'sent_count' => 1, 'failed_count' => 0)
    expect(lan.conversations.count).to eq(1)
    expect(lan.conversations.first.messages.outgoing.pluck(:content)).to eq(['Chào Chị Lan ơi'])
    expect(visitors.sum { |ci| ci.conversations.count }).to eq(1) # only the empty one that already existed
    expect(Message.outgoing.where(conversation_id: visitors.flat_map { |ci| ci.conversations.ids })).to be_empty
  end

  it 'greets a contact whose name the widget generated as "bạn", in the preview and in the message' do
    chatting_contact('lingering-grass-348')

    expect(service.preview(inbox_id: widget_inbox.id)[:sample_name]).to eq('bạn')
    record = send_campaign
    expect(record['sent_count']).to eq(1)
    expect(Message.outgoing.last.content).to eq('Chào bạn ơi')
  end

  it 'keeps a generated-looking pattern from swallowing real names' do
    expect(Kchat::Broadcasts::Dispatcher.recipient_name(build(:contact, name: 'Chị Lan'))).to eq('Chị Lan')
    expect(Kchat::Broadcasts::Dispatcher.recipient_name(build(:contact, name: 'Anh Tú-2'))).to eq('Anh Tú-2')
    expect(Kchat::Broadcasts::Dispatcher.recipient_name(build(:contact, name: 'billowing-snow-0042'))).to eq('bạn')
    expect(Kchat::Broadcasts::Dispatcher.recipient_name(build(:contact, name: ''))).to eq('bạn')
  end

  it 'reuses the last conversation, even a resolved one, instead of opening a new one' do
    lan = chatting_contact('Chị Lan')
    lan.conversations.first.update!(status: :resolved)

    send_campaign
    expect(lan.conversations.count).to eq(1)
    expect(lan.conversations.first.messages.outgoing.count).to eq(1)
  end

  it 'intersects a label or a segment with the contacts who wrote to the shop' do
    chatting_contact('Chị Lan', label: 'vip', email: 'lan@example.com')
    silent = anonymous_visitor('Khách im lặng')
    silent.contact.update!(email: 'silent@example.com')
    silent.contact.add_labels(['vip'])
    segment = create(:custom_filter, account: account, user: admin, filter_type: :contact, name: 'Có email',
                                     query: { payload: [{ attribute_key: 'email', filter_operator: 'contains', values: ['example.com'],
                                                          query_operator: nil, attribute_model: 'standard' }] })

    expect(service.audience_summary(labels: ['vip'])[:audience_count]).to eq(1)
    expect(service.audience_summary(segment_id: segment.id)[:audience_count]).to eq(1)
    expect(service.preview(inbox_id: widget_inbox.id, segment_id: segment.id)[:eligible_count]).to eq(1)
    expect(send_campaign(segment_id: segment.id)['sent_count']).to eq(1)
    expect(silent.conversations.count).to eq(0)
  end

  it 'does not count a broadcast as the first reply, so the customer still waits and response time stays clean' do
    lan = chatting_contact('Chị Lan')
    conversation = lan.conversations.first
    expect(conversation.reload.waiting_since).to be_present

    send_campaign
    expect(conversation.reload.first_reply_created_at).to be_nil
    expect(conversation.waiting_since).to be_present
    expect(Message.outgoing.last.additional_attributes).to include('campaign_id', 'kchat_broadcast_id')
  end
end
