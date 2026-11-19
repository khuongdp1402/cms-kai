# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::BroadcastsService do
  let(:account) { create(:account, name: 'Kalo Candles') }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:service) { described_class.new(account) }
  let(:zalo_inbox) { create(:inbox, account: account, channel: create(:channel_zalo_personal, account: account)) }
  let(:widget_inbox) { create(:inbox, account: account, channel: create(:channel_widget, account: account)) }

  def contact_in(inbox, name:, label: nil, city: nil)
    # Segments use Contacts::FilterService, which only matches contacts with an email, phone or identifier.
    contact = create(:contact, account: account, name: name, email: "#{SecureRandom.hex(4)}@example.com",
                               additional_attributes: { city: city }.compact)
    contact.add_labels([label]) if label
    create(:contact_inbox, contact: contact, inbox: inbox, source_id: "src_#{contact.id}_#{inbox.id}")
  end

  def segment_for(city)
    create(:custom_filter, account: account, user: admin, filter_type: :contact, name: "Khách #{city}",
                           query: { payload: [{ attribute_key: 'city', filter_operator: 'equal_to', values: [city],
                                                query_operator: nil, attribute_model: 'standard' }] })
  end

  describe 'drafts' do
    it 'saves a draft without sending and keeps the goal' do
      expect do
        record = service.create_broadcast!(user: admin, params: { title: 'Ra mắt nến mới', goal: 'launch', draft: true })
        expect(record).to include('status' => 'draft', 'goal' => 'launch', 'message' => '', 'inbox_id' => nil,
                                  'campaign_tag' => 'ra_mat_nen_moi')
      end.not_to have_enqueued_job(Kchat::SendBroadcastJob)
    end

    it 'rejects an unknown goal' do
      expect { service.create_broadcast!(user: admin, params: { title: 'X', goal: 'spam', draft: true }) }
        .to raise_error(described_class::ValidationError)
    end

    it 'updates a draft, then sends it when draft is false' do
      contact_in(zalo_inbox, name: 'Minh Thư')
      draft = service.create_broadcast!(user: admin, params: { title: 'Chăm khách', goal: 'retention', draft: true })

      updated = service.update_draft!(draft['id'], user: admin, params: { message: 'Chào {{name}}', inbox_id: zalo_inbox.id, draft: true })
      expect(updated).to include('id' => draft['id'], 'status' => 'draft', 'message' => 'Chào {{name}}', 'inbox_name' => zalo_inbox.name)

      expect do
        sent = service.update_draft!(draft['id'], user: admin, params: { draft: false })
        expect(sent).to include('id' => draft['id'], 'status' => 'processing', 'goal' => 'retention', 'eligible_count' => 1)
      end.to have_enqueued_job(Kchat::SendBroadcastJob).with(account.id, draft['id'])
      expect(service.list.size).to eq(1)
    end

    it 'refuses to edit or delete a broadcast that is no longer a draft' do
      record = service.create_broadcast!(user: admin, params: { title: 'Gửi rồi', message: 'Hi', inbox_id: zalo_inbox.id })
      expect { service.update_draft!(record['id'], user: admin, params: { message: 'x' }) }.to raise_error(described_class::ValidationError)
      expect { service.destroy_draft!(record['id']) }.to raise_error(described_class::ValidationError)
    end

    it 'deletes a draft' do
      draft = service.create_broadcast!(user: admin, params: { title: 'Bỏ', draft: true })
      service.destroy_draft!(draft['id'])
      expect(service.list).to be_empty
    end

    it 'schedules a non-draft for later with the Vietnam time offset kept' do
      at = 2.days.from_now.in_time_zone('Asia/Ho_Chi_Minh').change(sec: 0)
      expect do
        record = service.create_broadcast!(user: admin, params: { title: 'Hẹn', message: 'Hi', inbox_id: zalo_inbox.id,
                                                                  scheduled_at: at.iso8601 })
        expect(record['status']).to eq('scheduled')
        expect(Time.zone.parse(record['scheduled_at'])).to eq(at)
      end.to have_enqueued_job(Kchat::SendBroadcastJob).at(at)
    end
  end

  describe '#audience_summary' do
    it 'counts the audience by label and how many each inbox reaches' do
      contact_in(zalo_inbox, name: 'A', label: 'vip')
      contact_in(widget_inbox, name: 'B', label: 'vip')
      create(:contact, account: account, name: 'C (no channel)').add_labels(['vip'])
      contact_in(zalo_inbox, name: 'D', label: 'regular')

      summary = service.audience_summary(labels: ['vip'])
      expect(summary[:audience_count]).to eq(3)
      zalo = summary[:channels].find { |row| row[:inbox_id] == zalo_inbox.id }
      widget = summary[:channels].find { |row| row[:inbox_id] == widget_inbox.id }
      expect(zalo).to include(eligible_count: 1, read_status: false, rate_limit: { per_minute: 30, burst: 10 })
      expect(widget).to include(eligible_count: 1, read_status: true, rate_limit: nil)
    end

    it 'restricts the audience and the recipients to a saved contact segment' do
      contact_in(zalo_inbox, name: 'Hà Nội 1', city: 'hanoi')
      contact_in(zalo_inbox, name: 'Sài Gòn', city: 'saigon')
      segment = segment_for('hanoi')

      summary = service.audience_summary(segment_id: segment.id)
      expect(summary[:audience_count]).to eq(1)
      expect(summary[:channels].find { |row| row[:inbox_id] == zalo_inbox.id }[:eligible_count]).to eq(1)

      record = service.create_broadcast!(user: admin, params: { title: 'HN', message: 'Hi {{name}}', inbox_id: zalo_inbox.id,
                                                                segment_id: segment.id })
      service.execute_broadcast!(record['id'])
      expect(service.list.first).to include('status' => 'completed', 'sent_count' => 1, 'segment_id' => segment.id)
    end

    it 'fails loudly for a segment of another account' do
      other = create(:custom_filter, filter_type: :contact)
      expect { service.audience_summary(segment_id: other.id) }.to raise_error(described_class::ValidationError)
    end
  end

  describe '#check_content' do
    it 'reports default and brand profile hard bans' do
      account.update!(custom_attributes: { 'brand_growth' => { 'profile' => { 'hard_bans' => ['rẻ nhất'] } } })
      result = service.check_content('Nến rẻ nhất, tốt nhất thế giới')
      expect(result[:blocked_phrases]).to contain_exactly('rẻ nhất', 'tốt nhất thế giới')
      expect(service.check_content('Nến thơm dịu')[:blocked_phrases]).to eq([])
    end
  end

  describe '#results' do
    it 'counts sent, replies and attributed orders, and leaves read empty where the channel has no read status' do
      ci = contact_in(zalo_inbox, name: 'Minh Thư')
      contact_in(zalo_inbox, name: 'Quốc Bảo')
      record = service.create_broadcast!(user: admin, params: { title: 'Tết', message: 'Chào {{name}}', inbox_id: zalo_inbox.id })
      service.execute_broadcast!(record['id'])

      conversation = ci.conversations.last
      create(:message, account: account, inbox: zalo_inbox, conversation: conversation, message_type: :incoming, content: 'Còn hàng?')
      Kchat::Order.create_with_items!(account: account,
                                      attributes: { source: 'chat', payment_method: 'cash', conversation: conversation, contact: ci.contact },
                                      items: [{ name: 'Nến', unit_price: 300_000, quantity: 1 }])

      results = service.results(record['id'])[:results]
      expect(results).to include(sent_count: 2, failed_count: 0, delivery_failed_count: 0, replied_count: 1,
                                 orders_count: 1, revenue: 300_000, read_supported: false, read_count: nil)
    end

    it 'counts read messages on a channel that reports them' do
      contact_in(widget_inbox, name: 'Lan')
      record = service.create_broadcast!(user: admin, params: { title: 'Web', message: 'Hi', inbox_id: widget_inbox.id })
      service.execute_broadcast!(record['id'])
      Message.where("additional_attributes->>'kchat_broadcast_id' = ?", record['id']).find_each { |m| m.update!(status: :read) }

      expect(service.results(record['id'])[:results]).to include(read_supported: true, read_count: 1, replied_count: 0, orders_count: 0)
    end

    it 'ignores orders placed before the broadcast was sent' do
      ci = contact_in(zalo_inbox, name: 'Cũ')
      conversation = create(:conversation, account: account, inbox: zalo_inbox, contact: ci.contact, contact_inbox: ci)
      Kchat::Order.create_with_items!(account: account,
                                      attributes: { source: 'chat', payment_method: 'cash', conversation: conversation, contact: ci.contact },
                                      items: [{ name: 'Nến', unit_price: 100_000, quantity: 1 }])
      travel 1.minute do
        record = service.create_broadcast!(user: admin, params: { title: 'Sau', message: 'Hi', inbox_id: zalo_inbox.id })
        service.execute_broadcast!(record['id'])
        expect(service.results(record['id'])[:results]).to include(orders_count: 0, revenue: 0)
      end
    end

    it 'marks the broadcast failed when delivery raises' do
      record = service.create_broadcast!(user: admin, params: { title: 'Lỗi', message: 'Hi', inbox_id: zalo_inbox.id })
      allow_any_instance_of(Kchat::Broadcasts::Dispatcher).to receive(:deliver_batch).and_raise(StandardError, 'boom') # rubocop:disable RSpec/AnyInstance
      service.execute_broadcast!(record['id'])
      expect(service.list.first).to include('status' => 'failed')
    end
  end
end
