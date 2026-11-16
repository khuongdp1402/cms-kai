class Kchat::PaymentSettings
  FIELDS = %w[bank_bin bank_name account_number account_name].freeze
  KEY = 'payment'.freeze

  def self.for(account)
    stored = account.custom_attributes&.dig(KEY) || {}
    FIELDS.index_with { |field| stored[field] }
  end

  def self.update!(account, attributes)
    merged = self.for(account).merge(attributes.to_h.stringify_keys.slice(*FIELDS))
    account.update!(custom_attributes: (account.custom_attributes || {}).merge(KEY => merged))
    merged
  end

  def self.complete?(account)
    settings = self.for(account)
    settings['bank_bin'].present? && settings['account_number'].present?
  end
end
