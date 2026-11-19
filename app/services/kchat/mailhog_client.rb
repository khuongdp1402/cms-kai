# frozen_string_literal: true

require 'net/http'
require 'json'
require 'mail'

# Thin wrapper around the local/staging MailHog v2 HTTP API for SuperAdmin email inspection.
class Kchat::MailhogClient
  DEFAULT_URL = 'http://mailhog:8025'
  HTTP_TIMEOUT = 3
  MAX_MESSAGES = 50
  URL_PATTERN = %r{https?://[^\s"'<>()]+}

  def self.enabled?
    Rails.env.development? || Rails.env.test? || ENV['MAILHOG_API_URL'].present?
  end

  def initialize(base_url: ENV.fetch('MAILHOG_API_URL', DEFAULT_URL))
    @base_url = base_url.to_s.sub(%r{/+\z}, '')
  end

  def list(query: nil, limit: MAX_MESSAGES)
    return { enabled: false, reachable: false, total: 0, items: [] } unless self.class.enabled?

    uri = URI("#{@base_url}/api/v2/messages")
    uri.query = URI.encode_www_form({ limit: limit })
    payload = request_json(uri)
    raw_items = Array(payload['items']).map { |item| parse_item(item) }
    filtered = filter_items(raw_items, query)

    {
      enabled: true,
      reachable: true,
      total: filtered.size,
      items: filtered
    }
  rescue StandardError => e
    Rails.logger.warn("[Kchat::MailhogClient] fetch failed: #{e.class} #{e.message}")
    { enabled: true, reachable: false, total: 0, items: [], error: 'mailhog_unreachable' }
  end

  def delete_message(id)
    return false unless self.class.enabled?

    safe_id = id.to_s.strip
    return false if safe_id.blank? || safe_id.include?('/')

    request_delete(URI("#{@base_url}/api/v1/messages/#{URI.encode_www_form_component(safe_id)}"))
  end

  def clear_all
    return false unless self.class.enabled?

    request_delete(URI("#{@base_url}/api/v1/messages"))
  end

  private

  def filter_items(items, query)
    q = query.to_s.strip.downcase
    return items if q.blank?

    items.select do |item|
      [item[:subject], item[:from], item[:to].join(', '), item[:text_body]].any? do |field|
        field.to_s.downcase.include?(q)
      end
    end
  end

  def request_json(uri)
    http = build_http(uri)
    res = http.request(Net::HTTP::Get.new(uri.request_uri))
    raise "HTTP #{res.code}" unless res.is_a?(Net::HTTPSuccess)

    JSON.parse(res.body)
  end

  def request_delete(uri)
    res = build_http(uri).request(Net::HTTP::Delete.new(uri.request_uri))
    res.is_a?(Net::HTTPSuccess)
  rescue StandardError
    false
  end

  def build_http(uri)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'
    http.open_timeout = HTTP_TIMEOUT
    http.read_timeout = HTTP_TIMEOUT
    http
  end

  def parse_item(item)
    raw = item.dig('Raw', 'Data').to_s
    normalized_raw = raw.present? && !raw.end_with?("\n") ? "#{raw}\r\n" : raw
    mail = normalized_raw.present? ? Mail.read_from_string(normalized_raw) : nil
    html = extract_part(mail, 'text/html')
    text = extract_part(mail, 'text/plain') || strip_html(html) || raw
    subject = resolve_subject(mail, item)

    {
      id: item['ID'].to_s,
      subject: subject,
      from: resolve_sender(mail, item),
      to: resolve_recipients(mail, item),
      created_at: item['Created'].to_s,
      category: categorize_email(subject, text),
      html_body: html.to_s,
      text_body: text.to_s,
      headers: extract_headers(mail, item),
      action_links: extract_action_links(html.presence || text)
    }
  end

  def resolve_subject(mail, item)
    raw_subject = mail&.subject || Array(item.dig('Content', 'Headers', 'Subject')).first
    decode_header(raw_subject).presence || '(Không có tiêu đề)'
  end

  def resolve_sender(mail, item)
    (format_addresses(mail&.from) || format_raw_addr(item['From'])).to_s
  end

  def resolve_recipients(mail, item)
    recipients = Array(mail&.to).presence || Array(item['To']).filter_map { |a| format_raw_addr(a) }
    recipients.map(&:to_s)
  end

  def extract_part(mail, mime_prefix)
    return nil unless mail

    decoded = decoded_part_body(mail, mime_prefix)
    decoded&.force_encoding('UTF-8')&.scrub
  rescue StandardError
    nil
  end

  def decoded_part_body(mail, mime_prefix)
    if mail.multipart?
      part = mail.all_parts.find { |p| p.mime_type.to_s.start_with?(mime_prefix) }
      return part&.decoded
    end
    return unless single_part_matches?(mail, mime_prefix)

    mail.decoded.to_s
  end

  def single_part_matches?(mail, mime_prefix)
    mail.mime_type.to_s.start_with?(mime_prefix) || (mime_prefix == 'text/plain' && mail.mime_type.blank?)
  end

  def extract_headers(mail, item)
    if mail&.header
      mail.header.fields.each_with_object({}) { |f, memo| memo[f.name.to_s] = f.decoded.to_s }
    else
      item.dig('Content', 'Headers').to_h.transform_values { |v| Array(v).join(', ') }
    end
  rescue StandardError
    {}
  end

  def extract_action_links(content)
    urls = content.to_s.scan(URL_PATTERN).map { |u| u.sub(/[.,;)\]]+\z/, '') }.uniq
    urls.sort_by do |url|
      url.match?(/confirmation|reset_password|invitation|token|sign_in/i) ? 0 : 1
    end.first(5)
  end

  def categorize_email(subject, text)
    combined = "#{subject} #{text}".downcase
    return 'auth' if combined.match?(/xác thực|mật khẩu|password|confirm|invitation|mời/)
    return 'billing' if combined.match?(/thanh toán|gói cước|casso|hóa đơn|invoice|subscription/)

    'system'
  end

  def decode_header(val)
    Mail::Encodings.unquote_and_convert_to(val.to_s, 'UTF-8')
  rescue StandardError
    val.to_s
  end

  def format_addresses(addrs)
    Array(addrs).compact.join(', ').presence
  end

  def format_raw_addr(addr)
    return nil unless addr.is_a?(Hash) && addr['Mailbox'].present? && addr['Domain'].present?

    "#{addr['Mailbox']}@#{addr['Domain']}"
  end

  def strip_html(html)
    return nil if html.blank?

    ActionController::Base.helpers.strip_tags(html).squish
  end
end
