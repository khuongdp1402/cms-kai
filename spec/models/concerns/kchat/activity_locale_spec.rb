# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::ActivityLocale do
  let(:account) { create(:account, locale: 'vi') }
  let(:inbox) { create(:inbox, account: account) }
  let(:agent) { create(:user, account: account, name: 'Lan') }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }

  before { create(:inbox_member, user: agent, inbox: inbox) }

  after { Current.reset }

  def enqueued_contents
    ActiveJob::Base.queue_adapter.enqueued_jobs
                   .select { |job| job['job_class'] == 'Conversations::ActivityMessageJob' }
                   .map { |job| job['arguments'].second['content'] }
  end

  it 'writes the auto assignment line in Vietnamese even when the job runs in English' do
    conversation
    Current.executed_by = inbox
    I18n.with_locale(:en) { conversation.update!(assignee: agent) }

    expect(enqueued_contents).to include('Hệ thống phân công tự động đã giao hội thoại cho Lan')
  end

  it 'writes status and label lines in the shop language' do
    Current.user = agent
    I18n.with_locale(:en) do
      conversation.update!(status: :resolved)
      conversation.update!(label_list: ['vip'])
    end

    expect(enqueued_contents).to include('Cuộc trò chuyện được đánh dấu là đã giải quyết bởi Lan', 'Lan thêm vip')
  end

  it 'writes the mute line in the shop language' do
    conversation
    Current.user = agent
    I18n.with_locale(:en) { conversation.mute! }

    expect(enqueued_contents).to include('Lan đã tắt tiếng hội thoại')
  end

  it 'writes the auto-resolve "not sent" line from the template service in the shop language' do
    conversation
    I18n.with_locale(:en) do
      MessageTemplates::Template::AutoResolve.new(conversation: conversation).send(:create_auto_resolve_not_sent_activity_message)
    end

    expect(enqueued_contents).to include('Chưa gửi tin đóng hội thoại vì kênh đang giới hạn tin gửi đi')
  end

  it 'writes the CSAT "not sent" line in the shop language' do
    conversation
    I18n.with_locale(:en) do
      CsatSurveyService.new(conversation: conversation).send(:create_csat_not_sent_activity_message)
    end

    expect(enqueued_contents).to include('Chưa gửi khảo sát hài lòng vì kênh đang giới hạn tin gửi đi')
  end

  it 'keeps English for an English shop' do
    account.update!(locale: 'en')
    conversation
    Current.executed_by = inbox
    I18n.with_locale(:vi) { conversation.update!(assignee: agent) }

    expect(enqueued_contents).to include('Assigned to Lan by Default Policy')
  end
end
