class Api::V1::Accounts::Kchat::OrdersController < Api::V1::Accounts::Kchat::BaseController
  PER_PAGE = 25
  QR_TEXT = 'Quý khách vui lòng quét mã QR để thanh toán đơn #%<number>s, số tiền %<amount>s. Nội dung chuyển khoản: %<memo>s'.freeze

  before_action :fetch_order, only: [:show, :transition, :send_qr, :qr]

  def index
    authorize ::Kchat::Order
    scope = filtered_orders
    @count = scope.count
    @page = [params[:page].to_i, 1].max
    @orders = scope.offset((@page - 1) * PER_PAGE).limit(PER_PAGE)
  end

  def show
    authorize @order
  end

  def create
    authorize ::Kchat::Order
    contact = find_contact
    conversation = find_conversation(params[:conversation_id])
    return render_not_found if (params[:contact_id].present? && contact.nil?) || (params[:conversation_id].present? && conversation.nil?)

    @order = ::Kchat::Order.create_with_items!(account: Current.account, attributes: order_attributes(contact, conversation), items: item_params)
    render :show, status: :created
  rescue ActiveRecord::RecordNotFound
    render_not_found
  rescue ::Kchat::Order::InsufficientStock => e
    render_kchat_error('insufficient_stock', :unprocessable_entity, product_id: e.product_id)
  rescue ActiveRecord::RecordInvalid => e
    render_invalid(e.record)
  end

  def transition
    authorize @order
    @order.transition!(params[:event].to_s)
    render :show
  rescue ::Kchat::Order::InvalidTransition
    render_kchat_error('invalid_transition', :unprocessable_entity)
  end

  def send_qr
    authorize @order, :update?
    conversation = find_conversation(params[:conversation_id])
    return render_not_found unless conversation

    authorize conversation.inbox, :show?
    return unless qr_allowed?

    @message = Messages::MessageBuilder.new(Current.user, conversation, qr_message_params).perform
    render 'api/v1/accounts/conversations/messages/create', status: :created
  end

  def qr
    authorize @order, :show?
    return unless qr_allowed?

    send_data qr_png, type: 'image/png', disposition: 'inline'
  end

  private

  def fetch_order
    @order = ::Kchat::Order.find_by(account_id: Current.account.id, id: params[:id])
    render_not_found unless @order
  end

  def filtered_orders
    scope = ::Kchat::Order.where(account_id: Current.account.id).includes(:items, :contact, :conversation).order(number: :desc)
    scope = scope.where(status: params[:status]) if params[:status].present?
    params[:query].present? ? search(scope, params[:query].to_s.strip) : scope
  end

  def search(scope, query)
    pattern = "%#{::Kchat::Order.sanitize_sql_like(query)}%"
    by_text = ::Kchat::Order.left_joins(:contact, :items).where('contacts.name ILIKE :q OR kchat_order_items.name ILIKE :q', q: pattern)
    by_text = by_text.or(::Kchat::Order.where(number: query.to_i)) if query.match?(/\A\d+\z/)
    scope.where(id: by_text.select(:id))
  end

  def find_contact
    Current.account.contacts.find_by(id: params[:contact_id]) if params[:contact_id].present?
  end

  def find_conversation(display_id)
    Current.account.conversations.find_by(display_id: display_id) if display_id.present?
  end

  def order_attributes(contact, conversation)
    params.permit(:source, :payment_method, :shipping_address, :shipping_fee).to_h.merge(contact: contact, conversation: conversation)
  end

  def item_params
    params.permit(items: [:product_id, :name, :unit_price, :quantity])[:items] || []
  end

  def qr_allowed?
    code = qr_error_code
    render_kchat_error(code, :unprocessable_entity) if code
    code.nil?
  end

  def qr_error_code
    return 'invalid_payment_method' unless @order.payment_method_transfer_qr?

    'payment_settings_missing' unless ::Kchat::PaymentSettings.complete?(Current.account)
  end

  def memo
    "DH#{@order.number}"
  end

  def qr_png
    settings = ::Kchat::PaymentSettings.for(Current.account)
    payload = ::Kchat::VietQr.payload(bin: settings['bank_bin'], account_number: settings['account_number'], amount: @order.total, memo: memo)
    ::Kchat::VietQr.png(payload)
  end

  def qr_message_params
    {
      message_type: 'outgoing',
      content: format(QR_TEXT, number: @order.number, amount: formatted_amount, memo: memo),
      content_attributes: { kchat_order_id: @order.id },
      attachments: [qr_upload]
    }
  end

  def formatted_amount
    "#{ActiveSupport::NumberHelper.number_to_delimited(@order.total, delimiter: '.')}đ"
  end

  def qr_upload
    file = Tempfile.new(['qr', '.png'], binmode: true)
    file.write(qr_png)
    file.rewind
    ActionDispatch::Http::UploadedFile.new(tempfile: file, filename: "#{memo}.png", type: 'image/png')
  end
end
