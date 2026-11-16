class Kchat::PaymentSettings
  include ActiveModel::Validations

  FIELDS = %w[bank_bin bank_name account_number account_name].freeze
  KEY = 'payment'.freeze

  attr_reader(*FIELDS)

  validates :bank_bin, format: { with: /\A\d{6}\z/ }
  validates :account_number, format: { with: /\A\d{6,19}\z/ }
  validates :bank_name, :account_name, presence: true, length: { maximum: 60 }

  def self.for(account)
    stored = account.custom_attributes&.dig(KEY) || {}
    FIELDS.index_with { |field| stored[field] }
  end

  def self.update!(account, attributes)
    settings = new(self.for(account).merge(attributes.to_h.stringify_keys.slice(*FIELDS)))
    raise ActiveModel::ValidationError, settings unless settings.valid?

    # Lock and re-read so a credit the Casso webhook committed after this account was loaded is merged, not overwritten.
    account.with_lock do
      account.update!(custom_attributes: (account.custom_attributes || {}).merge(KEY => settings.to_h))
    end
    settings.to_h
  end

  def self.complete?(account)
    settings = self.for(account)
    settings['bank_bin'].present? && settings['account_number'].present?
  end

  def initialize(values)
    FIELDS.each { |field| instance_variable_set(:"@#{field}", values[field].to_s.presence) }
  end

  def to_h
    FIELDS.index_with { |field| public_send(field) }
  end
end
