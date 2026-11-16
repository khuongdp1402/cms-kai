class Api::V1::Accounts::Kchat::BaseController < Api::V1::Accounts::BaseController
  private

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
