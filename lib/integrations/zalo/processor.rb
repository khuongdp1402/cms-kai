# frozen_string_literal: true

require 'open-uri'

class Integrations::Zalo::Processor
  attr_reader :inbox, :params

  def initialize(inbox, params)
    @inbox = inbox
    @params = params
  end

  def perform
    return unless valid_zalo_event?
    return if sender_id.blank?

    contact = find_or_create_contact
    conversation = find_or_create_conversation(contact)
    create_message(conversation)
  end

  private

  def valid_zalo_event?
    params['event_name'].to_s.start_with?('user_send_')
  end

  def recipient_oa_id
    params.dig('recipient', 'id').to_s
  end

  def sender_id
    s_id = params.dig('sender', 'id').to_s
    return s_id if s_id.present? && s_id != recipient_oa_id

    params['user_id_by_app'].to_s
  end

  def message_text
    text = params.dig('message', 'text')
    return text if text.present?

    attachments = params.dig('message', 'attachments')
    if attachments.present?
      first_att = attachments.first
      type = first_att['type']
      payload = first_att['payload'] || {}

      case type
      when 'sticker'
        return '[Sticker]'
      when 'image'
        return '[Hình ảnh]'
      when 'audio'
        return '[Ghi âm]'
      when 'file'
        return '[Tệp tin]'
      when 'location'
        return "Vị trí: #{payload['coordinates'] || payload['address'] || '[Bản đồ]'}"
      else
        return "[Tin nhắn #{type}]"
      end
    end

    '[Tin nhắn Zalo]'
  end

  def find_or_create_contact
    sender_name = params.dig('sender', 'name').presence
    sender_avatar = params.dig('sender', 'avatar').presence

    # Zalo OA webhook thường không gửi tên user — gọi API lấy tên thật
    if sender_name.blank? || sender_name.start_with?('Zalo User')
      profile = fetch_zalo_user_profile(sender_id)
      if profile.present?
        sender_name = profile['display_name'].presence || sender_name
        sender_avatar = profile['avatar'].presence || sender_avatar
      end
    end

    sender_name = sender_name.presence || "Zalo User #{sender_id.to_s.last(4)}"

    contact_inbox = ::ContactInbox.find_by(inbox: inbox, source_id: sender_id)
    if contact_inbox.present?
      contact = contact_inbox.contact
      if contact.name.start_with?('Zalo User') && sender_name != contact.name && !sender_name.start_with?('Zalo User')
        contact.update(name: sender_name)
      end
      return contact
    end

    contact = ::Contact.create!(
      account: inbox.account,
      name: sender_name,
      custom_attributes: { zalo_user_id: sender_id }
    )

    if sender_avatar.present?
      begin
        contact.avatar.attach(io: URI.parse(sender_avatar).open, filename: "zalo_#{sender_id}.jpg")
      rescue StandardError => e
        Rails.logger.warn "Failed to attach Zalo avatar: #{e.message}"
      end
    end

    ::ContactInbox.create!(
      contact: contact,
      inbox: inbox,
      source_id: sender_id
    )

    contact
  end

  def fetch_zalo_user_profile(user_id)
    access_token = inbox.channel&.additional_attributes&.dig('zalo_access_token')
    return nil if access_token.blank?

    data_param = { user_id: user_id }.to_json
    response = HTTParty.get(
      'https://openapi.zalo.me/v3.0/oa/user/detail',
      headers: { 'access_token' => access_token },
      query: { data: data_param },
      timeout: 5
    )

    res_body = begin
      JSON.parse(response.body)
    rescue StandardError
      {}
    end

    if res_body['error'].to_i.zero? && res_body['data'].present?
      Rails.logger.info "✅ Zalo user profile fetched: #{res_body['data']['display_name']}"
      res_body['data']
    else
      Rails.logger.warn "⚠️ Zalo user profile fetch failed: #{response.body}"
      nil
    end
  rescue StandardError => e
    Rails.logger.warn "⚠️ Zalo user profile error: #{e.message}"
    nil
  end

  def find_or_create_conversation(contact)
    contact_inbox = ::ContactInbox.find_by(inbox: inbox, source_id: sender_id)

    conversation = ::Conversation.find_by(
      account: inbox.account,
      inbox: inbox,
      contact_inbox: contact_inbox,
      status: [:open, :pending]
    )

    if conversation.blank?
      conversation = ::Conversation.create!(
        account: inbox.account,
        inbox: inbox,
        contact: contact,
        contact_inbox: contact_inbox,
        status: :open
      )
    end

    # Tự động phân công Agent chăm sóc khách hàng
    if conversation.assignee_id.blank?
      assignee = inbox.inbox_members.first&.user || inbox.account.users.first
      conversation.update(assignee: assignee) if assignee.present?
    end

    conversation
  end

  def create_message(conversation)
    content = message_text
    return if content.blank?

    msg_id = params.dig('message', 'msg_id')
    return if msg_id.present? && conversation.messages.exists?(source_id: msg_id)

    message = conversation.messages.create!(
      account: inbox.account,
      inbox: inbox,
      message_type: :incoming,
      content: content,
      source_id: msg_id
    )

    process_attachments(message)
  end

  def process_attachments(message)
    attachments = params.dig('message', 'attachments') || []
    attachments.each do |att|
      url = att.dig('payload', 'url')
      next if url.blank?

      type = att['type']
      file_type = case type
                  when 'image', 'sticker' then 'image'
                  when 'audio' then 'audio'
                  when 'video' then 'video'
                  else 'file'
                  end

      message.attachments.create!(
        account_id: message.account_id,
        file_type: file_type,
        external_url: url
      )
    end
  end
end
