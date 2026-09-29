# Shows the configured BRAND_NAME wherever a translation mentions the upstream
# product name, without editing locale files (ADR-007).
module Ktech; end

module Ktech::BrandedI18n
  PRODUCT_NAME = /chatwoot/i
  # Captured so String#split keeps them at odd indexes: placeholders and URLs.
  PROTECTED = %r<(%\{[^}]*\}|https?://\S+)>

  def self.brand(text, brand_name)
    text.split(PROTECTED).each_with_index.map { |part, index| index.odd? ? part : part.gsub(PRODUCT_NAME, brand_name) }.join
  end

  protected

  def lookup(locale, key, scope = [], options = {})
    result = super
    return result unless result.is_a?(String) && result.match?(PRODUCT_NAME)

    brand_name = GlobalConfig.get_value('BRAND_NAME').presence
    brand_name ? Ktech::BrandedI18n.brand(result, brand_name) : result
  end
end

I18n::Backend::Simple.prepend(Ktech::BrandedI18n)
