# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::BroadcastsService do
  let(:account) { create(:account, name: 'Kalo Candles') }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:service) { described_class.new(account) }
  let(:zalo_inbox) { create(:inbox, account: account, channel: create(:channel_zalo_personal, account: account)) }
  let(:widget_inbox) { create(:inbox, account: account, channel: create(:channel_widget, account: account)) }

  # A customer who wrote to the shop in this inbox: only they can receive a campaign (broadcasts_audience_spec).
  def contact_in(inbox, name:, label: nil, city: nil)
    # Segments use Contacts::FilterService, which only matches contacts with an email, phone or identifier.
    contact = create(:contact, account: account, name: name, email: "#{SecureRandom.hex(4)}@example.com",
                               additional_attributes: { city: city }.compact)
    contact.add_labels([label]) if label
    create(:contact_inbox, contact: contact, inbox: inbox, source_id: "src_#{contact.id}_#{inbox.id}").tap do |ci|
      conversation = create(:conversation, account: account, inbox: inbox, contact: contact, contact_inbox: ci)
      create(:message, account: account, inbox: inbox, conversation: conversation, sender: contact, message_type: :incoming,
                       content: 'Chào shop', created_at: 1.day.ago)
    end
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
      expect(summary[:audience_count]).to eq(2) # C never wrote to the shop, so a campaign cannot reach them
      zalo = summary[:channels].find { |row| row[:inbox_id] == zalo_inbox.id }
      widget = summary[:channels].find { |row| row[:inbox_id] == widget_inbox.id }
      expect(zalo).to include(eligible_count: 1, read_status: false, rate_limit: { per_minute: 30, burst: 10 })
      expect(widget).to include(eligible_count: 1, read_status: true, rate_limit: nil)
    end

    it 'names the first recipient the way {{name}} is filled at send time' do
      contact_in(zalo_inbox, name: 'Chị Lan', label: 'vip')
      contact_in(zalo_inbox, name: 'Anh Tú', label: 'vip')
      widget_inbox # an inbox nobody in the audience reached

      rows = service.audience_summary(labels: ['vip'])[:channels]
      expect(rows.find { |row| row[:inbox_id] == zalo_inbox.id }[:sample_name]).to eq('Chị Lan')
      expect(rows.find { |row| row[:inbox_id] == widget_inbox.id }[:sample_name]).to eq('bạn')
      expect(service.preview(inbox_id: zalo_inbox.id, labels: ['vip'])[:sample_name]).to eq('Chị Lan')
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

    it 'adds channel delivery failures to the list rows' do
      contact_in(zalo_inbox, name: 'Lỗi gửi')
      record = service.create_broadcast!(user: admin, params: { title: 'Zalo', message: 'Hi', inbox_id: zalo_inbox.id })
      service.execute_broadcast!(record['id'])
      Message.where("additional_attributes->>'kchat_broadcast_id' = ?", record['id']).find_each { |m| m.update!(status: :failed) }

      expect(service.list_with_delivery_stats.first).to include('id' => record['id'], 'sent_count' => 1, 'delivery_failed_count' => 1)
    end

    it 'marks the broadcast failed when delivery raises' do
      record = service.create_broadcast!(user: admin, params: { title: 'Lỗi', message: 'Hi', inbox_id: zalo_inbox.id })
      allow_any_instance_of(Kchat::Broadcasts::Dispatcher).to receive(:deliver_batch).and_raise(StandardError, 'boom') # rubocop:disable RSpec/AnyInstance
      service.execute_broadcast!(record['id'])
      expect(service.list.first).to include('status' => 'failed')
    end
  end

  describe 'safety' do
    it 'delivers a broadcast once even when the job runs twice' do
      ci = contact_in(zalo_inbox, name: 'Một lần')
      record = service.create_broadcast!(user: admin, params: { title: 'Một lần', message: 'Hi', inbox_id: zalo_inbox.id })
      service.execute_broadcast!(record['id'])
      described_class.new(account).execute_broadcast!(record['id'])

      expect(ci.conversations.last.messages.outgoing.count).to eq(1)
      expect(service.list.first).to include('status' => 'completed', 'sent_count' => 1)
    end

    it 'sends a draft once when two requests send it at the same time' do
      contact_in(zalo_inbox, name: 'Song song')
      draft = service.create_broadcast!(user: admin, params: { title: 'Song song', message: 'Hi', inbox_id: zalo_inbox.id, draft: true })
      stale = described_class.new(account)
      stale_record = stale.find!(draft['id'])
      allow(stale).to receive(:find!).and_return(stale_record)

      expect do
        service.update_draft!(draft['id'], user: admin, params: { draft: false })
        expect { stale.update_draft!(draft['id'], user: admin, params: { draft: false }) }
          .to raise_error(described_class::ValidationError)
      end.to have_enqueued_job(Kchat::SendBroadcastJob).exactly(:once)
    end

    it 'keeps a draft when PATCH has no draft flag' do
      draft = service.create_broadcast!(user: admin, params: { title: 'Giữ nháp', draft: true })
      expect do
        expect(service.update_draft!(draft['id'], user: admin, params: { message: 'Hi', inbox_id: zalo_inbox.id })['status']).to eq('draft')
      end.not_to have_enqueued_job(Kchat::SendBroadcastJob)
    end

    it 'does not send a scheduled campaign when the trial expired before it ran' do
      ci = contact_in(zalo_inbox, name: 'Hết hạn')
      record = service.create_broadcast!(user: admin, params: { title: 'Hẹn', message: 'Hi', inbox_id: zalo_inbox.id,
                                                                scheduled_at: 1.day.from_now.iso8601 })
      account.update_columns(created_at: 30.days.ago) # rubocop:disable Rails/SkipsModelValidations
      service.execute_broadcast!(record['id'])

      expect(service.list.first).to include('status' => 'failed', 'error' => 'subscription_expired', 'sent_count' => 0)
      expect(ci.conversations.count).to eq(1)
      expect(ci.conversations.first.messages.outgoing.count).to eq(0)
    end

    it 'rejects sending with a schedule in the past' do
      expect do
        service.create_broadcast!(user: admin, params: { title: 'Cũ', message: 'Hi', inbox_id: zalo_inbox.id,
                                                         scheduled_at: 1.minute.ago.iso8601 })
      end.to raise_error(described_class::ValidationError, 'schedule_in_past')
    end

    it 'gives every campaign its own tag' do
      first = service.create_broadcast!(user: admin, params: { title: 'Tết', draft: true })
      second = service.create_broadcast!(user: admin, params: { title: 'Tết', draft: true })
      third = service.create_broadcast!(user: admin, params: { title: 'Tết', campaign_tag: 'tet', draft: true })
      expect([first, second, third].pluck('campaign_tag')).to eq(%w[tet tet-2 tet-3])
      expect(service.update_draft!(first['id'], user: admin, params: { message: 'x' })['campaign_tag']).to eq('tet')
    end
  end

  describe 'store' do
    let(:store) { Kchat::Broadcasts::Store.new(account) }

    it 'makes tags unique under the lock even when two records were built with the same tag' do
      store.add!({ 'id' => 'a', 'status' => 'draft', 'campaign_tag' => 'tet' })
      second = store.add!({ 'id' => 'b', 'status' => 'draft', 'campaign_tag' => 'tet' })
      updated = store.update!('a') { |item| item.merge('campaign_tag' => 'tet-2') }

      expect(second['campaign_tag']).to eq('tet-2')
      expect(updated['campaign_tag']).to eq('tet-2-2')
      expect(store.list.pluck('campaign_tag')).to contain_exactly('tet-2', 'tet-2-2')
    end

    it 'fails runs that stalled and leaves fresh ones alone' do
      now = Time.current
      account.update!(custom_attributes: { 'kchat_broadcasts' => [
                        { 'id' => 'old-send', 'status' => 'sending', 'started_at' => (now - 3.hours).iso8601 },
                        { 'id' => 'new-send', 'status' => 'sending', 'started_at' => (now - 10.minutes).iso8601 },
                        { 'id' => 'lost', 'status' => 'processing', 'created_at' => (now - 2.days).iso8601,
                          'queued_at' => (now - 1.hour).iso8601 },
                        { 'id' => 'queued', 'status' => 'processing', 'created_at' => (now - 2.days).iso8601,
                          'queued_at' => (now - 5.minutes).iso8601 },
                        { 'id' => 'later', 'status' => 'scheduled', 'created_at' => (now - 2.days).iso8601 }
                      ] })

      statuses = service.list.to_h { |item| [item['id'], [item['status'], item['error']]] }
      expect(statuses).to eq('old-send' => %w[failed stalled], 'new-send' => ['sending', nil], 'lost' => %w[failed stalled],
                             'queued' => ['processing', nil], 'later' => ['scheduled', nil])
    end

    it 'does not reap a draft that was sent long after it was created' do
      contact_in(zalo_inbox, name: 'Nháp cũ')
      draft = travel_to(3.days.ago) do
        service.create_broadcast!(user: admin, params: { title: 'Cũ', message: 'Hi', inbox_id: zalo_inbox.id, draft: true })
      end
      service.update_draft!(draft['id'], user: admin, params: { draft: false })
      expect(service.list.first).to include('status' => 'processing')
    end
  end

  describe 'list cap' do
    def fill_with(status, count)
      items = Array.new(count) { |i| { 'id' => "#{status}-#{i}", 'title' => status, 'status' => status, 'campaign_tag' => "#{status}_#{i}" } }
      account.update!(custom_attributes: { 'kchat_broadcasts' => items })
    end

    it 'drops the oldest finished campaign, never a scheduled one or a draft' do
      fill_with('scheduled', 29)
      account.update!(custom_attributes: { 'kchat_broadcasts' => service.list + [{ 'id' => 'old', 'status' => 'completed' }] })

      service.create_broadcast!(user: admin, params: { title: 'Mới', draft: true })
      ids = service.list.pluck('id')
      expect(ids.size).to eq(30)
      expect(ids).not_to include('old')
      expect(ids.count { |id| id.start_with?('scheduled-') }).to eq(29)
    end

    it 'refuses a new campaign when nothing can be dropped' do
      fill_with('scheduled', 30)
      expect { service.create_broadcast!(user: admin, params: { title: 'Đầy', draft: true }) }
        .to raise_error(described_class::ValidationError, 'broadcast_limit_reached')
    end

    it 'moves a draft to the front when it is sent' do
      contact_in(zalo_inbox, name: 'Lên đầu')
      draft = service.create_broadcast!(user: admin, params: { title: 'Nháp cũ', message: 'Hi', inbox_id: zalo_inbox.id, draft: true })
      service.create_broadcast!(user: admin, params: { title: 'Nháp mới', draft: true })
      service.update_draft!(draft['id'], user: admin, params: { draft: false })
      expect(service.list.first['id']).to eq(draft['id'])
    end
  end

  it 'counts only orders placed within 7 days of the send' do
    ci = contact_in(zalo_inbox, name: 'Muộn')
    record = service.create_broadcast!(user: admin, params: { title: 'Cửa sổ', message: 'Hi', inbox_id: zalo_inbox.id })
    service.execute_broadcast!(record['id'])
    conversation = ci.conversations.last
    travel 8.days do
      Kchat::Order.create_with_items!(account: account,
                                      attributes: { source: 'chat', payment_method: 'cash', conversation: conversation },
                                      items: [{ name: 'Nến', unit_price: 100_000, quantity: 1 }])
      expect(service.results(record['id'])[:results]).to include(orders_count: 0, attribution_days: 7)
    end
  end
end
