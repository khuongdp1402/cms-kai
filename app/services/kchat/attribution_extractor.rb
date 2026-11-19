# frozen_string_literal: true

class Kchat::AttributionExtractor
  UTM_KEYS = %w[utm_source utm_medium utm_campaign utm_content].freeze

  def self.apply(additional_attributes)
    return additional_attributes unless additional_attributes.is_a?(Hash)

    referer = additional_attributes['referer'].presence || additional_attributes.dig('initiated_at', 'referer').presence
    return additional_attributes if referer.blank?

    parsed = extract_utm_from_url(referer)
    return additional_attributes if parsed.empty?

    parsed.each do |key, value|
      additional_attributes[key] = value if additional_attributes[key].blank?
    end
    additional_attributes
  end

  def self.extract_utm_from_url(url)
    uri = URI.parse(url.to_s.strip)
    return {} if uri.query.blank?

    query = Rack::Utils.parse_nested_query(uri.query)
    UTM_KEYS.each_with_object({}) do |key, memo|
      val = query[key].to_s.strip.first(120)
      memo[key] = val if val.present?
    end
  rescue URI::InvalidURIError, ArgumentError
    {}
  end
end
