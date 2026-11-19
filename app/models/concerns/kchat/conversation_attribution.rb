# frozen_string_literal: true

module Kchat::ConversationAttribution
  extend ActiveSupport::Concern

  included do
    before_validation :extract_kchat_utm_attribution
  end

  private

  def extract_kchat_utm_attribution
    return unless additional_attributes.is_a?(Hash)

    Kchat::AttributionExtractor.apply(additional_attributes)
  end
end
