# frozen_string_literal: true

# Applies Casso (VietQR open banking) bank transactions to tenant accounts.
#
# Transfer description format: "KCHAT <ACCOUNT_REF> [PLAN|TOKEN|SEED] <ORDER_ID>"
# ACCOUNT_REF is the numeric account id or the `tenant_slug` custom attribute (set by super admin only).
# Account names are never used for matching because they are not unique.
class Casso::WebhookHandler
  MAX_STORED_TIDS = 200
  DESCRIPTION_PATTERN = /KCHAT[\s\-_]+([A-Za-z0-9_-]+?)(?:[\s\-_]+(PLAN|TOKEN|SEED))?[\s\-_]+([0-9]+)/i
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

  private

  def process_single_transaction(transaction)
    log_data = {
      tid: (transaction['tid'] || transaction['id']).to_s.strip,
      amount: transaction['amount'].to_i,
      description: transaction['description'].to_s,
      received_at: transaction['when'] || Time.current.iso8601
    }
    return log_data.merge(status: 'invalid_transaction') if log_data[:tid].blank? || log_data[:amount] <= 0

    match = log_data[:description].match(DESCRIPTION_PATTERN)
    account = match && find_account(match[1])
    return log_data.merge(status: 'unmatched_account_recorded') if account.nil?

    apply_matched(account, match, log_data)
  end

  def apply_matched(account, match, log_data)
    order_type = (match[2] || 'PLAN').upcase
    log_data.merge!(account_id: account.id, order_type: order_type, order_id: match[3])
    log_data.merge(status: apply_payment(account, amount: log_data[:amount], order_type: order_type, order_id: match[3], tid: log_data[:tid]))
  end

  def find_account(ref)
    clean_ref = ref.to_s.strip.downcase
    return Account.find_by(id: clean_ref) if clean_ref.match?(/\A\d+\z/)

    Account.find_by("lower(custom_attributes->>'tenant_slug') = ?", clean_ref)
  end

  # Locks the account row so concurrent webhook retries cannot credit the same tid twice.
  def apply_payment(account, amount:, order_type:, order_id:, tid:)
    account.with_lock do
      attrs = (account.custom_attributes || {}).deep_dup
      processed_tids = Array(attrs['processed_casso_tids'])
      next 'duplicate_ignored' if processed_tids.include?(tid)

      status = credit(attrs, amount, order_type)
      attrs.merge!(
        'processed_casso_tids' => (processed_tids << tid).last(MAX_STORED_TIDS),
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

  def credit(attrs, amount, order_type)
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

  # Underpaid plan transfers are recorded (tid is stored) but never activate a plan;
  # support reconciles them manually.
  def extend_subscription(attrs, amount)
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
end
