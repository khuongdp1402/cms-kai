# frozen_string_literal: true

require 'httparty'
require 'open-uri'

class ZaloListener < BaseListener
  def message_created(event)
    message = event.data[:message]
    return unless outbound_zalo_message?(message)

    send_zalo_message(message)
  end

  private

  def channel_attributes(inbox)
    inbox.channel.try(:additional_attributes) || {}
  end

  def outbound_zalo_message?(message)
    return false unless message.outgoing? || message.template?
    return false if message.private?

    zalo_oa_inbox?(message.inbox)
  end

  def zalo_oa_inbox?(inbox)
    return false unless inbox.channel_type == 'Channel::Api'

    attrs = inbox.channel.try(:additional_attributes) || {}
    return false if attrs['channel'] == 'zalo_personal' || attrs['zalo_type'] == 'personal'

    attrs['channel'] == 'zalo' ||
      attrs['zalo_type'] == 'hybrid' ||
      attrs['zalo_oa_id'].present? ||
      attrs['zalo_access_token'].present?
  end

  def send_zalo_message(message, retry_on_expired = true)
    inbox = message.inbox
    attrs = channel_attributes(inbox)

    recipient_id = message.conversation.contact_inbox.source_id
    return if recipient_id.blank?

    if attrs['zalo_access_token'].blank?
      Rails.logger.error "❌ Missing Zalo Access Token for inbox #{inbox.id}"
      return
    end

    zalo_access_token = attrs['zalo_access_token']

    # Chuẩn bị Payload cho Zalo OA (Văn bản hoặc Hình ảnh)
    payload = build_zalo_payload(message, recipient_id, zalo_access_token)

    response = HTTParty.post(
      'https://openapi.zalo.me/v3.0/oa/message/cs',
      headers: {
        'Content-Type' => 'application/json',
        'access_token' => zalo_access_token
      },
      body: payload.to_json
    )

    res_body = begin
      JSON.parse(response.body)
    rescue StandardError
      {}
    end

    error_code = res_body['error'] || res_body['error_code']

    if error_code == -224
      Rails.logger.error '❌ Zalo OA lỗi -224 (Chưa mua gói API). Không thể gửi tin nhắn.'
      return
    end

    # Tự động đổi Refresh Token nếu Access Token hết hạn (Lỗi -216 hoặc -201)
    if (error_code == -216 || error_code == -201) && retry_on_expired
      Rails.logger.warn "⚠️ Zalo Access Token hết hạn (Error #{error_code}). Đang kích hoạt gia hạn tự động qua Refresh Token..."
      new_token = refresh_zalo_access_token!(inbox)
      if new_token.present?
        # Thử lại lần thứ 2 với Token mới
        send_zalo_message(message, false)
      else
        Rails.logger.error "❌ Thất bại gia hạn Zalo Token cho inbox #{inbox.id}"
      end
    end
  rescue StandardError => e
    Rails.logger.error "❌ Zalo Send Message Error: #{e.message}\n#{e.backtrace.first(3).join("\n")}"
  end

  def build_zalo_payload(message, recipient_id, access_token)
    attachment = message.attachments.first

    if attachment.present? && (attachment.file_type == 'image' || attachment.image?)
      attachment_id = upload_image_to_zalo(attachment, access_token)
      if attachment_id.present?
        return {
          recipient: { user_id: recipient_id },
          message: {
            text: message.content || '',
            attachment: {
              type: 'template',
              payload: {
                template_type: 'media',
                elements: [
                  {
                    media_type: 'image',
                    attachment_id: attachment_id
                  }
                ]
              }
            }
          }
        }
      end
    end

    {
      recipient: { user_id: recipient_id },
      message: { text: message.content || '' }
    }
  end

  def upload_image_to_zalo(attachment, access_token)
    file_url = attachment.download_url
    return nil if file_url.blank?

    temp_file = Tempfile.new(['zalo_upload', '.jpg'])
    temp_file.binmode
    temp_file.write(URI.parse(file_url).open.read)
    temp_file.rewind

    response = HTTParty.post(
      'https://openapi.zalo.me/v2.0/oa/upload/image',
      headers: { 'access_token' => access_token },
      multipart: true,
      body: { file: temp_file }
    )

    temp_file.close
    temp_file.unlink

    res_body = begin
      JSON.parse(response.body)
    rescue StandardError
      {}
    end

    res_body.dig('data', 'attachment_id')
  rescue StandardError => e
    Rails.logger.error "❌ Lỗi tải ảnh lên Zalo OA CDN: #{e.message}"
    nil
  end

  def refresh_zalo_access_token!(inbox)
    attrs = channel_attributes(inbox)
    refresh_token = attrs['zalo_refresh_token']
    app_id = attrs['zalo_app_id']
    app_secret = attrs['zalo_app_secret']

    if refresh_token.blank? || app_id.blank? || app_secret.blank?
      Rails.logger.error '❌ Thất bại: Thiếu zalo_refresh_token, zalo_app_id hoặc zalo_app_secret để gia hạn tự động.'
      return nil
    end

    response = HTTParty.post(
      'https://oauth.zaloapp.com/v4/oa/access_token',
      headers: {
        'Content-Type' => 'application/x-www-form-urlencoded',
        'secret_key' => app_secret
      },
      body: {
        refresh_token: refresh_token,
        app_id: app_id,
        grant_type: 'refresh_token'
      }
    )

    res_body = begin
      JSON.parse(response.body)
    rescue StandardError
      {}
    end

    new_access_token = res_body['access_token']
    new_refresh_token = res_body['refresh_token']

    if new_access_token.present?
      Rails.logger.info '✅ Gia hạn thành công Zalo Access Token mới!'
      updated_attrs = attrs.merge(
        'zalo_access_token' => new_access_token,
        'zalo_refresh_token' => new_refresh_token || refresh_token
      )
      inbox.channel.update!(additional_attributes: updated_attrs)
      new_access_token
    else
      Rails.logger.error "❌ Lỗi gia hạn Zalo Token từ Zalo OAuth: #{response.body}"
      nil
    end
  rescue StandardError => e
    Rails.logger.error "❌ Lỗi thực thi gia hạn Token Zalo: #{e.message}"
    nil
  end
end
