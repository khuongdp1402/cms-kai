# frozen_string_literal: true

class Api::V1::Accounts::Kchat::ConversationsController < Api::V1::Accounts::Kchat::BaseController
  MAX_ATTR_CHARS = 100

  def attribution
    conversation = Current.account.conversations.find_by!(display_id: params[:id])
    attrs = conversation.additional_attributes.to_h.deep_dup

    %w[utm_source utm_medium utm_campaign].each do |key|
      next unless params.key?(key)

      val = params[key].to_s.strip.first(MAX_ATTR_CHARS)
      val.present? ? attrs[key] = val : attrs.delete(key)
    end

    conversation.update!(additional_attributes: attrs)
    maybe_sync_campaign_label(conversation, attrs['utm_campaign'])

    render json: attribution_payload(conversation)
  end

  private

  def maybe_sync_campaign_label(conversation, utm_campaign)
    return unless ActiveModel::Type::Boolean.new.cast(params[:sync_label]) && utm_campaign.present?

    slug = utm_campaign.to_s
                       .unicode_normalize(:nfkd)
                       .gsub(/[\u0300-\u036f]/, '')
                       .tr('đĐ', 'dd')
                       .downcase
                       .gsub(/[^a-z0-9_-]+/, '_')
                       .gsub(/\A[_-]+|[_-]+\z/, '')
                       .first(50)
    return if slug.blank?

    Current.account.labels.find_or_create_by!(title: slug)
    conversation.add_labels([slug]) unless conversation.label_list.include?(slug)
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
    nil
  end

  def attribution_payload(conversation)
    attrs = conversation.additional_attributes.to_h
    {
      conversation_id: conversation.display_id,
      utm_source: attrs['utm_source'],
      utm_medium: attrs['utm_medium'],
      utm_campaign: attrs['utm_campaign'],
      source_type: attrs['source_type'],
      platform: attrs['platform'],
      comment_id: attrs['comment_id'],
      post_id: attrs['post_id'],
      permalink: attrs['permalink'],
      private_reply_sent: attrs['private_reply_sent'] == true
    }
  end
end
