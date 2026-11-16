class Api::V1::Console::AccountsController < Api::V1::Console::BaseController
  FILTERS = %w[all trial expiring locked].freeze
  MAX_EXTEND_DAYS = 365

  before_action :require_string_query!, only: :index

  def index
    scope = filtered(Account.all)
    accounts = paginate(scope.order(created_at: :desc, id: :desc))
    render json: { payload: accounts.map { |a| account_json(a) }, meta: list_meta(scope.count) }
  end

  def update
    account = Account.find(params[:id])
    extend_days = parse_extend_days
    return render_error('invalid_extend_days', :unprocessable_entity) if extend_days == :invalid

    account.with_lock do
      account.status = ActiveModel::Type::Boolean.new.cast(params[:locked]) ? :suspended : :active if params.key?(:locked)
      extend_subscription(account, extend_days) if extend_days
      account.save!
    end
    render json: account_json(account)
  end

  private

  def require_string_query!
    render_error('invalid_query', :unprocessable_entity) if params.key?(:query) && !params[:query].is_a?(String)
  end

  def filtered(scope)
    scope = search(scope) if params[:query].present?
    case params[:filter]
    when 'trial' then scope.where(Kchat::AccountScopes::TRIAL_SQL, now: Time.current, trial_start: Kchat::Entitlements::TRIAL_DAYS.days.ago)
    when 'expiring' then scope.where(Kchat::AccountScopes::EXPIRING_SQL, now: Time.current, soon: 7.days.from_now)
    when 'locked' then scope.suspended
    else scope
    end
  end

  def search(scope)
    scope.where("accounts.name ILIKE :q OR accounts.id::text = :id OR accounts.custom_attributes->>'tenant_slug' ILIKE :q",
                q: "%#{Account.sanitize_sql_like(params[:query])}%", id: params[:query].to_s)
  end

  # nil when absent, :invalid unless an integer from 1 to MAX_EXTEND_DAYS
  def parse_extend_days
    return unless params.key?(:extend_days)

    days = Integer(params[:extend_days].to_s, 10, exception: false)
    days&.between?(1, MAX_EXTEND_DAYS) ? days : :invalid
  end

  def extend_subscription(account, days)
    base = [Kchat::Entitlements.paid_until(account), Time.current].compact.max
    account.custom_attributes = account.custom_attributes.merge('subscription_valid_until' => (base + days.days).iso8601,
                                                                'subscription_status' => 'active')
  end

  def account_json(account)
    { id: account.id, name: account.name, plan: account.custom_attributes['subscription_plan'], status: Kchat::Entitlements.status(account),
      valid_until: Kchat::Entitlements.valid_until(account).iso8601, days_left: Kchat::Entitlements.days_left(account),
      locked: account.suspended?, created_at: account.created_at.iso8601 }
  end
end
