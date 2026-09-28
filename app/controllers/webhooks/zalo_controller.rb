# frozen_string_literal: true

class Webhooks::ZaloController < ActionController::API
  def process_payload
    return site_verification if request.get?

    inbox = find_zalo_inbox

    if inbox.present?
      Integrations::Zalo::Processor.new(inbox, params.to_unsafe_hash).perform
    else
      Rails.logger.warn "Zalo Webhook Warning: No matching Zalo inbox found for params #{params.inspect}"
    end

    render json: { status: 'success', message: 'Webhook received' }, status: :ok
  rescue StandardError => e
    Rails.logger.error "Zalo Webhook Error: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
    head :ok
  end

  def site_verification
    code = extract_verification_code
    html_content = <<~HTML
      <!DOCTYPE html>
      <html lang="en">

      <head>
          <meta property="zalo-platform-site-verification" content="#{code}" />
      </head>

      <body>
      There Is No Limit To What You Can Accomplish Using Zalo!
      </body>

      </html>
    HTML

    # rubocop:disable Rails/OutputSafety
    render html: html_content.html_safe, status: :ok
    # rubocop:enable Rails/OutputSafety
  end

  def verify
    render json: { status: 'success' }, status: :ok
  end

  private

  def find_zalo_inbox
    if params[:inbox_id].present?
      inbox = Inbox.find_by(id: params[:inbox_id])
      return inbox if inbox.present?
    end

    recipient_oa_id = params.dig('recipient', 'id').to_s.presence ||
                      params['oa_id'].to_s.presence ||
                      params['app_id'].to_s.presence

    if recipient_oa_id.present?
      oa_inbox = Inbox.where(channel_type: 'Channel::Api').find do |inbox|
        attrs = inbox.channel.try(:additional_attributes) || {}
        next if attrs['channel'] == 'zalo_personal' || attrs['zalo_type'] == 'personal'

        attrs['zalo_oa_id'].to_s == recipient_oa_id || attrs['zalo_app_id'].to_s == recipient_oa_id
      end
      return oa_inbox if oa_inbox.present?
    end

    Inbox.where(channel_type: 'Channel::Api').find do |inbox|
      attrs = inbox.channel.try(:additional_attributes) || {}
      next if attrs['channel'] == 'zalo_personal' || attrs['zalo_type'] == 'personal'

      attrs['channel'] == 'zalo' ||
        attrs['zalo_type'] == 'hybrid' ||
        attrs['zalo_oa_id'].present? ||
        attrs['zalo_app_id'].present? ||
        inbox.name.to_s.downcase.include?('oa') ||
        inbox.name.to_s.downcase.include?('zalo')
    end
  end

  def extract_verification_code
    path_info = request.path.to_s
    if path_info.include?('zalo-platform-site-verification=')
      extracted = path_info.split('zalo-platform-site-verification=').last.to_s.sub(/\.html$/, '').sub(%r{/*$}, '')
      return extracted if extracted.present?
    end

    return params[:code] if params[:code].present?
    return params['zalo-platform-site-verification'] if params['zalo-platform-site-verification'].present?

    inbox = find_zalo_inbox
    if inbox.present?
      attrs = inbox.channel.try(:additional_attributes) || {}
      return attrs['zalo_site_verification'] if attrs['zalo_site_verification'].present?
    end

    'RCI05epQ1Jjf-DKXilSEBcpPkXc0hs12DZCq'
  end
end
