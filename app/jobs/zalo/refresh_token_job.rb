# frozen_string_literal: true

module Zalo
  class RefreshTokenJob < ApplicationJob
    queue_as :scheduled_jobs

    def perform
      zalo_oa_inboxes.each do |inbox|
        refresh_token_for(inbox)
      rescue StandardError => e
        Rails.logger.error "❌ Zalo Token Refresh failed for inbox #{inbox.id}: #{e.message}"
      end
    end

    private

    def zalo_oa_inboxes
      Inbox.where(channel_type: 'Channel::Api').select do |inbox|
        attrs = inbox.channel&.additional_attributes || {}
        attrs['channel'] == 'zalo' && attrs['zalo_refresh_token'].present? &&
          attrs['zalo_app_id'].present? && attrs['zalo_app_secret'].present?
      end
    end

    def refresh_token_for(inbox)
      attrs = inbox.channel.additional_attributes
      response = HTTParty.post(
        'https://oauth.zaloapp.com/v4/oa/access_token',
        headers: {
          'Content-Type' => 'application/x-www-form-urlencoded',
          'secret_key' => attrs['zalo_app_secret']
        },
        body: {
          refresh_token: attrs['zalo_refresh_token'],
          app_id: attrs['zalo_app_id'],
          grant_type: 'refresh_token'
        }
      )

      res_body = JSON.parse(response.body) rescue {}
      new_access_token = res_body['access_token']
      new_refresh_token = res_body['refresh_token']

      if new_access_token.present?
        updated_attrs = attrs.merge(
          'zalo_access_token' => new_access_token,
          'zalo_refresh_token' => new_refresh_token || attrs['zalo_refresh_token']
        )
        inbox.channel.update!(additional_attributes: updated_attrs)
        Rails.logger.info "✅ Zalo Token refreshed for inbox #{inbox.id} (#{inbox.name})"
      else
        Rails.logger.error "❌ Zalo Token refresh returned empty for inbox #{inbox.id}: #{response.body}"
      end
    end
  end
end
