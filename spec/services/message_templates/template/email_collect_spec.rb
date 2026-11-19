require 'rails_helper'

describe MessageTemplates::Template::EmailCollect do
  context 'when this hook is called' do
    let(:conversation) { create(:conversation) }

    it 'creates the email collect messages' do
      described_class.new(conversation: conversation).perform
      expect(conversation.messages.count).to eq(2)
    end
  end

  context 'when the account locale differs from the server locale' do
    let(:account) { create(:account, locale: 'vi') }
    let(:conversation) { create(:conversation, account: account) }

    it 'writes both messages in the account locale' do
      I18n.with_locale(:en) { described_class.new(conversation: conversation).perform }

      contents = conversation.messages.order(:id).pluck(:content)
      expect(contents).to eq(
        [
          I18n.t('conversations.templates.ways_to_reach_you_message_body', locale: :vi, account_name: account.name),
          I18n.t('conversations.templates.email_input_box_message_body', locale: :vi, account_name: account.name)
        ]
      )
      expect(contents.last).to eq('Nhận thông báo qua email')
    end
  end
end
