# frozen_string_literal: true

# Applies Casso (VietQR open banking) bank transactions to tenant accounts.
#
# Transfer description format: "KALO <ACCOUNT_REF> [PLAN|TOKEN|SEED] <ORDER_ID>"
# ACCOUNT_REF is the numeric account id or the `tenant_slug` custom attribute (set by super admin only).
# Account names are never used for matching because they are not unique.
#
# Every transaction is stored as a Kchat::PaymentEvent. The unique index on `tid` is the idempotency source of truth:
# the event is inserted in the same DB transaction as the credit, and a RecordNotUnique means it was already handled.
class Casso::WebhookHandler
  DESCRIPTION_PATTERN = /KALO[\s\-_]+([A-Za-z0-9_-]+?)(?:[\s\-_]+(PLAN|TOKEN|SEED))?[\s\-_]+([0-9]+)/i
  # Monthly plan prices in VND, highest first.
  PLAN_PRICES = { 'enterprise' => 1_990_000, 'growth' => 699_000, 'starter' => 299_000 }.freeze
  SEED_CREDIT_PRICE = 500

  attr_reader :transactions

  def initialize(params)
    payload = params.respond_to?(:to_unsafe_h) ? params.to_unsafe_h : params.to_h
    @transactions = Array(payload['data'] || payload[:data])
  end

  def process
    results = transactions.map { |tx| process_single_transaction(tx.to_h.stringify_keys) }
    { error: 0, processed_count: results.size, results: results }
  end

  def self.subscription_active?(account)
    valid_until = account&.custom_attributes&.dig('subscription_valid_until')
    return false if valid_until.blank?

    Time.zone.parse(valid_until) > Time.current
  end

  # Order type (PLAN|TOKEN|SEED) and order id written in a transfer description; PLAN when it has none.
  def self.parse_description(description)
    match = description.to_s.match(DESCRIPTION_PATTERN)
    { order_type: (match&.[](2) || 'PLAN').upcase, order_id: match&.[](3) }
  end

  # Credits an account for one payment. Locks the account row; returns 'matched_and_activated' or 'underpaid_recorded'.
  def self.apply_payment(account, amount:, order_type:, order_id:, tid:)
    account.with_lock do
      attrs = (account.custom_attributes || {}).deep_dup
      status = credit(attrs, amount, order_type)
      attrs.merge!(
        'last_payment_gateway' => 'casso_vietqr',
        'last_payment_amount' => amount,
        'last_payment_at' => Time.current.iso8601,
        'last_casso_order_id' => order_id,
        'last_casso_tid' => tid
      )
      account.update!(custom_attributes: attrs)
      Rails.logger.info "[Casso] account=#{account.id} tid=#{tid} type=#{order_type} amount=#{amount} status=#{status}"
      status
    end
  end

  def self.credit(attrs, amount, order_type)
    case order_type
    when 'TOKEN'
      attrs['ai_tokens_balance'] = attrs['ai_tokens_balance'].to_i + amount
    when 'SEED'
      attrs['seeding_credits_balance'] = attrs['seeding_credits_balance'].to_i + (amount / SEED_CREDIT_PRICE)
    else
      return extend_subscription(attrs, amount)
    end
    'matched_and_activated'
  end

  # Underpaid plan transfers never activate a plan; support reconciles them manually.
  def self.extend_subscription(attrs, amount)
    plan = PLAN_PRICES.find { |_name, price| amount >= price }&.first
    if plan.nil?
      attrs['pending_underpaid_amount'] = attrs['pending_underpaid_amount'].to_i + amount
      return 'underpaid_recorded'
    end

    current_until = attrs['subscription_valid_until'].present? ? Time.zone.parse(attrs['subscription_valid_until']) : Time.current
    attrs['subscription_plan'] = plan
    attrs['subscription_valid_until'] = ([current_until, Time.current].max + 30.days).iso8601
    attrs['subscription_status'] = 'active'
    'matched_and_activated'
  end
  private_class_method :credit, :extend_subscription

  private

  def process_single_transaction(transaction)
    log_data = {
      tid: (transaction['tid'] || transaction['id']).to_s.strip,
      amount: transaction['amount'].to_i,
      description: transaction['description'].to_s,
      received_at: (Time.zone.parse(transaction['when'].to_s) || Time.current).iso8601
    }
    return log_data.merge(status: 'invalid_transaction') if log_data[:tid].blank? || log_data[:amount] <= 0

    account = match_account(log_data)
    log_data.merge(status: store_and_apply(account, log_data, transaction))
  rescue ActiveRecord::RecordNotUnique
    log_data.merge(status: 'duplicate_ignored')
  end

  # Fills log_data with the parsed order and returns the matching account, or nil when none matches.
  def match_account(log_data)
    match = log_data[:description].match(DESCRIPTION_PATTERN)
    account = match && find_account(match[1])
    log_data.merge!(account_id: account.id, order_type: (match[2] || 'PLAN').upcase, order_id: match[3]) if account
    account
  end

  # Inserts the event first (the unique tid index rejects a repeat) and credits in the same DB transaction.
  def store_and_apply(account, log_data, transaction)
    Kchat::PaymentEvent.transaction(requires_new: true) do
      event = Kchat::PaymentEvent.create!(tid: log_data[:tid], amount: log_data[:amount], description: log_data[:description],
                                          received_at: log_data[:received_at], raw: transaction, account: account)
      next 'unmatched_account_recorded' if account.nil?

      status = self.class.apply_payment(account, amount: log_data[:amount], order_type: log_data[:order_type],
                                                 order_id: log_data[:order_id], tid: log_data[:tid])
      event.update!(status: status == 'matched_and_activated' ? 'matched' : 'underpaid')
      status
    end
  end

  def find_account(ref)
    clean_ref = ref.to_s.strip.downcase
    return Account.find_by(id: clean_ref) if clean_ref.match?(/\A\d+\z/)

    Account.find_by("lower(custom_attributes->>'tenant_slug') = ?", clean_ref)
  end
end
