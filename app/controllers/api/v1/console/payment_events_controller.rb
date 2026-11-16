class Api::V1::Console::PaymentEventsController < Api::V1::Console::BaseController
  ASSIGNABLE_STATUS = 'unmatched'.freeze

  class NotAssignable < StandardError; end
  class AmbiguousDescription < StandardError; end

  rescue_from AmbiguousDescription, with: -> { render_error('description_ambiguous', :unprocessable_entity) }
  rescue_from NotAssignable, with: -> { render_error('event_not_assignable', :unprocessable_entity) }

  def index
    scope = Kchat::PaymentEvent.all
    scope = scope.where(status: params[:status]) if params[:status].present?
    events = paginate(scope.includes(:account).order(received_at: :desc, id: :desc))
    render json: { payload: events.map { |e| payment_event_json(e) }, meta: list_meta(scope.count) }
  end

  # Credits the account exactly once: the row lock plus the status check make a second assign fail.
  def assign
    account = Account.find(params.require(:account_id))
    event = Kchat::PaymentEvent.transaction do
      locked = Kchat::PaymentEvent.lock.find(params[:id])
      raise NotAssignable unless locked.status == ASSIGNABLE_STATUS

      apply_to(account, locked)
      locked
    end
    render json: payment_event_json(event)
  end

  private

  def apply_to(account, event)
    parsed = Casso::WebhookHandler.parse_description(event.description)
    raise AmbiguousDescription if parsed[:order_type].nil?

    status = Casso::WebhookHandler.apply_payment(account, amount: event.amount, order_type: parsed[:order_type], order_id: parsed[:order_id],
                                                          tid: event.tid)
    event.update!(account: account, status: status == 'matched_and_activated' ? 'applied' : 'underpaid')
  end
end
