# Platform console API: only SuperAdmin users, never scoped to an account.
class Api::V1::Console::BaseController < Api::BaseController
  PER_PAGE = 25

  before_action :require_super_admin!

  private

  def require_super_admin!
    render json: { error: 'forbidden' }, status: :forbidden unless current_user.is_a?(SuperAdmin)
  end

  def render_error(code, status)
    render json: { error: code }, status: status
  end

  def page
    [params[:page].to_i, 1].max
  end

  def paginate(scope)
    scope.offset((page - 1) * PER_PAGE).limit(PER_PAGE)
  end

  def list_meta(count)
    { count: count, current_page: page, per_page: PER_PAGE }
  end

  def payment_event_json(event)
    { id: event.id, tid: event.tid, amount: event.amount, description: event.description, status: event.status,
      account_id: event.account_id, account_name: event.account&.name, received_at: event.received_at.iso8601 }
  end
end
