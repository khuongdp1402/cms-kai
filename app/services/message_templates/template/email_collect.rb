class MessageTemplates::Template::EmailCollect
  pattr_initialize [:conversation!]

  def perform
    # Runs in a background job, where I18n.locale is the server default; the customer sees the shop's language.
    I18n.with_locale(account.locale) do
      ActiveRecord::Base.transaction do
        conversation.messages.create!(ways_to_reach_you_message_params)
        conversation.messages.create!(email_input_box_template_message_params)
      end
    end
  rescue StandardError => e
    ChatwootExceptionTracker.new(e, account: conversation.account).capture_exception
    true
  end

  private

  delegate :contact, :account, to: :conversation
  delegate :inbox, to: :message

  def ways_to_reach_you_message_params
    content = I18n.t('conversations.templates.ways_to_reach_you_message_body',
                     account_name: account.name)

    {
      account_id: @conversation.account_id,
      inbox_id: @conversation.inbox_id,
      message_type: :template,
      content: content
    }
  end

  def email_input_box_template_message_params
    content = I18n.t('conversations.templates.email_input_box_message_body',
                     account_name: account.name)

    {
      account_id: @conversation.account_id,
      inbox_id: @conversation.inbox_id,
      message_type: :template,
      content_type: :input_email,
      content: content
    }
  end
end
