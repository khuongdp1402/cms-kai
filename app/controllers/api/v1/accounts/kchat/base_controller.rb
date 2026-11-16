class Api::V1::Accounts::Kchat::BaseController < Api::V1::Accounts::BaseController
  rescue_from ActiveRecord::RecordInvalid, with: ->(e) { render_invalid(e.record) }
  rescue_from ActiveModel::ValidationError, with: ->(e) { render_invalid(e.model) }
  rescue_from ::Kchat::Order::InvalidTransition, with: -> { render_kchat_error('invalid_transition', :unprocessable_entity) }
  rescue_from ::Kchat::Order::InsufficientStock,
              with: ->(e) { render_kchat_error('insufficient_stock', :unprocessable_entity, product_id: e.product_id) }

  rescue_from ::Kchat::Entitlements::Expired, with: -> { render_kchat_error('subscription_expired', :forbidden) }

  private

  def require_active_subscription!
    ::Kchat::Entitlements.require_active!(Current.account)
  end

  def render_kchat_error(code, status, extra = {})
    render json: { error: code }.merge(extra), status: status
  end

  def render_not_found
    render_kchat_error('not_found', :not_found)
  end

  def render_invalid(record)
    base = record.errors[:base].first
    render_kchat_error(base || 'validation_failed', :unprocessable_entity, message: record.errors.full_messages.join(', '))
  end
end
