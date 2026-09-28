# frozen_string_literal: true

require 'down'

class ZaloPersonal::AttachmentImporter
  # User-Agent matching the Chrome fingerprint used by zca-js during QR login.
  # Zalo CDN may reject requests without a browser-like User-Agent.
  ZALO_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

  MAX_RETRIES = 2

  def initialize(message:)
    @message = message
    @account = message.account
  end

  def import_from_url(url:, file_type: :image, filename: nil)
    return if url.blank?

    tempfile = download_with_retry(url)
    content_type = tempfile.content_type || 'application/octet-stream'
    name = filename.presence || tempfile.original_filename.presence || "attachment_#{SecureRandom.hex(4)}"

    if File.extname(name).blank?
      ext = case content_type
            when 'image/jpeg', 'image/jpg' then '.jpg'
            when 'image/png' then '.png'
            when 'image/gif' then '.gif'
            when 'image/webp' then '.webp'
            when 'video/mp4' then '.mp4'
            when 'audio/ogg' then '.ogg'
            when 'audio/mpeg' then '.mp3'
            else
              file_type.to_sym == :image ? '.jpg' : ''
            end
      name = "#{name}#{ext}"
    end

    attachment = @message.attachments.new(
      account_id: @account.id,
      file_type: file_type.to_s,
      file: {
        io: tempfile,
        filename: name,
        content_type: content_type
      }
    )

    attachment.save!
    attachment
  rescue StandardError => e
    Rails.logger.error "Failed to import Zalo attachment for message #{@message.id}: #{e.class} — #{e.message}"
    nil
  end

  private

  def download_with_retry(url)
    retries = 0
    begin
      Down.download(
        url,
        max_size: 50.megabytes,
        max_redirects: 5,
        headers: {
          'User-Agent' => ZALO_USER_AGENT,
          'Referer' => 'https://chat.zalo.me/'
        }
      )
    rescue Down::TimeoutError, Down::ConnectionError, Down::ServerError => e
      retries += 1
      if retries <= MAX_RETRIES
        Rails.logger.warn "Zalo attachment download attempt #{retries} failed (#{e.class}), retrying: #{url}"
        sleep(0.5 * retries)
        retry
      end
      raise
    end
  end
end
