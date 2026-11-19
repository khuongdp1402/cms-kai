require 'rails_helper'

RSpec.describe 'Kchat orders API', type: :request do
  let(:account) { create(:account) }
  let(:other_account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:headers) { agent.create_new_auth_token }
  let(:base) { "/api/v1/accounts/#{account.id}/kchat/orders" }
  let(:payment) { { 'bank_bin' => '970436', 'account_number' => '0123456789', 'bank_name' => 'Vietcombank', 'account_name' => 'NGUYEN VAN A' } }
  let(:free_item) { { name: 'Phí', unit_price: 1000, quantity: 2 } }
  let(:attrs) { { source: 'manual', payment_method: 'transfer_qr' } }

  def make_order(acct = account, extra: {}, items: [free_item])
    Kchat::Order.create_with_items!(account: acct, attributes: attrs.merge(extra), items: items)
  end

  def make_conversation(acct = account)
    inbox = create(:inbox, account: acct)
    create(:inbox_member, inbox: inbox, user: agent) if acct == account
    create(:conversation, account: acct, inbox: inbox, contact_inbox: create(:contact_inbox, contact: create(:contact, account: acct), inbox: inbox))
  end

  describe 'GET index and show' do
    it 'lists own orders with contract shape, filtered by status and query' do
      make_order
      paid = make_order(extra: { payment_method: 'cash' })
      make_order(other_account)
      get base, headers: headers, as: :json
      expect(response.parsed_body['payload'].pluck('number')).to contain_exactly(1001, 1002)
      get base, params: { status: 'paid' }, headers: headers, as: :json
      expect(response.parsed_body['payload'].pluck('id')).to eq([paid.id])
      get base, params: { query: '1001' }, headers: headers, as: :json
      expect(response.parsed_body['payload'].pluck('number')).to eq([1001])
    end

    it 'exposes delivery_status and delivery=pending leaves POS sales out of Cần giao' do
      shipped = make_order(extra: { payment_method: 'cash' })
      pos = make_order(extra: { source: 'pos', payment_method: 'cash' })
      get base, headers: headers, as: :json
      statuses = response.parsed_body['payload'].to_h { |order| [order['id'], order['delivery_status']] }
      expect(statuses).to eq(shipped.id => 'pending', pos.id => 'not_applicable')
      get base, params: { delivery: 'pending' }, headers: headers, as: :json
      expect(response.parsed_body['payload'].pluck('id')).to eq([shipped.id])
      expect(response.parsed_body['meta']['count']).to eq(1)
    end

    it 'filters by contact_id of the own account and reports paid_total' do
      contact = create(:contact, account: account)
      make_order(extra: { contact: contact })
      make_order(extra: { contact: contact, payment_method: 'cash' }, items: [{ name: 'A', unit_price: 5000, quantity: 2 }])
      make_order
      get base, params: { contact_id: contact.id }, headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['payload'].pluck('number')).to contain_exactly(1001, 1002)
      expect(response.parsed_body['meta']['count']).to eq(2)
      expect(response.parsed_body['meta']['paid_total']).to eq(10_000)
    end

    it 'returns 404 for the contact of another account' do
      foreign = create(:contact, account: other_account)
      make_order(other_account, extra: { contact: foreign })
      get base, params: { contact_id: foreign.id }, headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      expect(response.body).not_to include('1001')
    end

    it 'returns 404 for a non-numeric contact_id' do
      make_order
      get base, params: { contact_id: 'abc' }, headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
    end

    it 'paid_total counts paid, shipping and completed but not pending or cancelled' do
      paid = make_order(extra: { payment_method: 'cash' }, items: [{ name: 'A', unit_price: 1000, quantity: 1 }])
      shipping = make_order(extra: { payment_method: 'cash' }, items: [{ name: 'B', unit_price: 2000, quantity: 1 }])
      shipping.transition!('ship')
      completed = make_order(extra: { payment_method: 'cash' }, items: [{ name: 'C', unit_price: 4000, quantity: 1 }])
      completed.transition!('ship')
      completed.transition!('complete')
      cancelled = make_order(extra: { payment_method: 'cash' }, items: [{ name: 'D', unit_price: 8000, quantity: 1 }])
      cancelled.transition!('cancel')
      make_order(items: [{ name: 'E', unit_price: 16_000, quantity: 1 }])
      get base, headers: headers, as: :json
      expect(paid.reload.status).to eq('paid')
      expect(response.parsed_body['meta']['paid_total']).to eq(7000)
    end

    it 'renders the order JSON as per the contract' do
      contact = create(:contact, account: account, name: 'Lan', phone_number: '+84901234567')
      order = make_order(extra: { contact: contact, shipping_fee: 30_000 })
      get "#{base}/#{order.id}", headers: headers, as: :json
      expect(response.parsed_body).to include(
        'id' => order.id, 'number' => 1001, 'status' => 'pending_payment', 'source' => 'manual', 'payment_method' => 'transfer_qr',
        'contact' => { 'id' => contact.id, 'name' => 'Lan', 'phone' => '+84901234567' }, 'conversation_id' => nil,
        'subtotal' => 2000, 'shipping_fee' => 30_000, 'total' => 32_000, 'paid_at' => nil
      )
      expect(response.parsed_body['items'].first).to include('product_id' => nil, 'name' => 'Phí', 'unit_price' => 1000, 'quantity' => 2)
      expect(response.parsed_body.keys).to include('shipping_address', 'shipping_carrier', 'tracking_code', 'created_at')
    end

    it 'agent of account A gets 404 for order of account B' do
      foreign = make_order(other_account)
      get "#{base}/#{foreign.id}", headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body['error']).to eq('not_found')
    end
  end

  describe 'POST create' do
    it 'create with product_id copies name and price' do
      product = Kchat::Product.create!(account: account, name: 'Áo', price: 150_000, stock: 5)
      post base, params: attrs.merge(items: [{ product_id: product.id, quantity: '2', unit_price: 1 }]), headers: headers, as: :json
      expect(response).to have_http_status(:created)
      expect(response.parsed_body['items'].first).to include('name' => 'Áo', 'unit_price' => 150_000, 'quantity' => 2, 'product_id' => product.id)
      expect(response.parsed_body['total']).to eq(300_000)
      expect(product.reload.stock).to eq(3)
    end

    it 'cash order is created paid' do
      post base, params: { source: 'pos', payment_method: 'cash', items: [free_item] }, headers: headers, as: :json
      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include('status' => 'paid')
      expect(response.parsed_body['paid_at']).to be_present
    end

    it 'does not mass-assign protected fields' do
      protected = { id: 77, status: 'completed', number: 5, total: 1, account_id: other_account.id, paid_at: '2000-01-01' }
      post base, params: attrs.merge(items: [free_item], **protected), headers: headers, as: :json
      expect(response).to have_http_status(:created)
      expect(Kchat::Order.find(response.parsed_body['id']))
        .to have_attributes(account_id: account.id, status: 'pending_payment', number: 1001, total: 2000)
    end

    it 'free item without unit_price returns 422' do
      post base, params: attrs.merge(items: [{ name: 'Phí', quantity: 1 }]), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(Kchat::Order.count).to eq(0)
    end

    it 'zero quantity returns 422' do
      post base, params: attrs.merge(items: [free_item.merge(quantity: 0)]), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'insufficient_stock returns 422 with product_id' do
      product = Kchat::Product.create!(account: account, name: 'Áo', price: 1000, stock: 1)
      post base, params: attrs.merge(items: [{ product_id: product.id, quantity: 2 }]), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq('error' => 'insufficient_stock', 'product_id' => product.id)
      expect(product.reload.stock).to eq(1)
    end

    it 'product of another account returns 404' do
      foreign = Kchat::Product.create!(account: other_account, name: 'X', price: 1000)
      post base, params: attrs.merge(items: [{ product_id: foreign.id, quantity: 1 }]), headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      expect(Kchat::Order.count).to eq(0)
    end

    it 'inactive product returns 422 product_inactive' do
      product = Kchat::Product.create!(account: account, name: 'X', price: 1000, active: false)
      post base, params: attrs.merge(items: [{ product_id: product.id, quantity: 1 }]), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('product_inactive')
    end

    it 'contact or conversation of another account returns 404' do
      foreign_conversation = make_conversation(other_account)
      foreign_contact = create(:contact, account: other_account)
      post base, params: attrs.merge(conversation_id: foreign_conversation.display_id, items: [free_item]), headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      post base, params: attrs.merge(contact_id: foreign_contact.id, items: [free_item]), headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      post base, params: attrs.merge(contact_id: 9_999_999, items: [free_item]), headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      expect(Kchat::Order.count).to eq(0)
    end

    it 'resolves conversation_id within the current account when the display_id also exists in another account' do
      foreign_conversation = make_conversation(other_account)
      own_conversation = make_conversation
      expect(own_conversation.display_id).to eq(foreign_conversation.display_id)
      post base, params: attrs.merge(conversation_id: foreign_conversation.display_id, items: [free_item]), headers: headers, as: :json
      expect(response).to have_http_status(:created)
      expect(Kchat::Order.find(response.parsed_body['id']).conversation_id).to eq(own_conversation.id)
    end

    it 'create refuses a conversation whose contact differs from the given contact' do
      conversation = make_conversation
      other_contact = create(:contact, account: account)
      post base, params: attrs.merge(contact_id: other_contact.id, conversation_id: conversation.display_id, items: [free_item]),
                 headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('conversation_contact_mismatch')
      expect(Kchat::Order.count).to eq(0)
    end

    it 'create refuses a conversation of an inbox the agent is not a member of' do
      conversation = create(:conversation, account: account)
      post base, params: attrs.merge(conversation_id: conversation.display_id, items: [free_item]), headers: headers, as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(Kchat::Order.count).to eq(0)
    end

    it 'links own contact and conversation' do
      conversation = make_conversation
      post base, params: attrs.merge(contact_id: conversation.contact_id, conversation_id: conversation.display_id, items: [free_item]),
                 headers: headers, as: :json
      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include('conversation_id' => conversation.display_id)
    end

    it 'total above the maximum returns 422' do
      post base, params: attrs.merge(items: [{ name: 'Vàng', unit_price: 9_999_999_999, quantity: 2 }]), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(Kchat::Order.count).to eq(0)
    end
  end

  describe 'POST transition' do
    it 'transition mark_paid then ship then complete' do
      order = make_order
      %w[mark_paid ship complete].zip(%w[paid shipping completed]).each do |event, status|
        post "#{base}/#{order.id}/transition", params: { event: event }, headers: headers, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body['status']).to eq(status)
      end
      expect(order.reload.paid_at).to be_present
    end

    it 'cancel restores stock' do
      product = Kchat::Product.create!(account: account, name: 'Áo', price: 1000, stock: 4)
      order = make_order(items: [{ product_id: product.id, quantity: 3 }])
      post "#{base}/#{order.id}/transition", params: { event: 'cancel' }, headers: headers, as: :json
      expect(response.parsed_body['status']).to eq('cancelled')
      expect(product.reload.stock).to eq(4)
    end

    it 'invalid_transition returns 422' do
      order = make_order
      post "#{base}/#{order.id}/transition", params: { event: 'complete' }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('invalid_transition')
      post "#{base}/#{order.id}/transition", params: { event: 'bogus' }, headers: headers, as: :json
      expect(response.parsed_body['error']).to eq('invalid_transition')
      expect(order.reload.status).to eq('pending_payment')
    end

    it 'maps a validation failure during transition to an error code' do
      order = make_order
      order.update_columns(shipping_fee: -1) # rubocop:disable Rails/SkipsModelValidations
      post "#{base}/#{order.id}/transition", params: { event: 'mark_paid' }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('validation_failed')
      expect(order.reload.status).to eq('pending_payment')
    end

    it 'agent of account A gets 404 for order of account B' do
      foreign = make_order(other_account)
      post "#{base}/#{foreign.id}/transition", params: { event: 'mark_paid' }, headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.status).to eq('pending_payment')
    end
  end

  describe 'POST send_qr' do
    let(:conversation) { make_conversation }
    let(:order) { make_order(extra: { shipping_fee: 401_000 }) }

    before { account.update!(custom_attributes: { 'payment' => payment }) }

    it 'send_qr creates an outgoing message with an attachment on the given conversation and sets content_attributes.kchat_order_id' do
      post "#{base}/#{order.id}/send_qr", params: { conversation_id: conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:created)
      message = conversation.messages.reload.last
      expect(response.parsed_body['id']).to eq(message.id)
      expect(message).to have_attributes(message_type: 'outgoing', sender_id: agent.id)
      expect(message.content_attributes['kchat_order_id']).to eq(order.id)
      expect(message.content).to include('403.000đ').and include("DH#{order.number}")
      expect(message.attachments.count).to eq(1)
      expect(message.attachments.first).to have_attributes(file_type: 'image')
    end

    it 'send_qr is refused for an agent who is not a member of the conversation inbox' do
      other_inbox_conversation = create(:conversation, account: account)
      post "#{base}/#{order.id}/send_qr", params: { conversation_id: other_inbox_conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(other_inbox_conversation.messages.count).to eq(0)
    end

    it 'send_qr returns payment_settings_missing when settings empty' do
      account.update!(custom_attributes: {})
      post "#{base}/#{order.id}/send_qr", params: { conversation_id: conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('payment_settings_missing')
      expect(conversation.messages.count).to eq(0)
    end

    it 'send_qr and qr return invalid_amount for a zero total order' do
      zero = make_order(items: [{ name: 'Tặng', unit_price: 0, quantity: 1 }])
      post "#{base}/#{zero.id}/send_qr", params: { conversation_id: conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('invalid_amount')
      get "#{base}/#{zero.id}/qr", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('invalid_amount')
    end

    it 'send_qr rejects an order that is not pending_payment' do
      order.transition!(:mark_paid)
      post "#{base}/#{order.id}/send_qr", params: { conversation_id: conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('order_not_payable')
      expect(conversation.messages.count).to eq(0)
    end

    it 'qr refuses a payable image for orders that are no longer pending_payment' do
      order.transition!(:mark_paid)
      get "#{base}/#{order.id}/qr", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('order_not_payable')
    end

    it 'qr still returns a png for a pending transfer_qr order' do
      get "#{base}/#{order.id}/qr", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq('image/png')
    end

    it 'send_qr rejects a conversation of a different contact than the order contact' do
      contact_order = make_order(extra: { contact: create(:contact, account: account) })
      post "#{base}/#{contact_order.id}/send_qr", params: { conversation_id: conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('conversation_contact_mismatch')
      expect(conversation.messages.count).to eq(0)
    end

    it 'send_qr text is rendered from the vi locale with amount and memo' do
      account.update!(locale: 'vi')
      post "#{base}/#{order.id}/send_qr", params: { conversation_id: conversation.display_id }, headers: headers, as: :json
      expect(conversation.messages.reload.last.content)
        .to eq("Quý khách vui lòng quét mã QR để thanh toán đơn ##{order.number}, số tiền 403.000đ. Nội dung chuyển khoản: DH#{order.number}")
    end

    it 'send_qr rejects non transfer_qr orders' do
      cod = make_order(extra: { payment_method: 'cod' })
      post "#{base}/#{cod.id}/send_qr", params: { conversation_id: conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('invalid_payment_method')
    end

    it 'send_qr with conversation of another account returns 404' do
      foreign_conversation = make_conversation(other_account)
      post "#{base}/#{order.id}/send_qr", params: { conversation_id: foreign_conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      expect(foreign_conversation.messages.count).to eq(0)
    end

    it 'agent of account A gets 404 for order of account B' do
      foreign = make_order(other_account)
      post "#{base}/#{foreign.id}/send_qr", params: { conversation_id: conversation.display_id }, headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET qr' do
    it 'returns a png of the order amount' do
      account.update!(custom_attributes: { 'payment' => payment })
      order = make_order
      get "#{base}/#{order.id}/qr", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq('image/png')
      expect(response.body.b[0, 8]).to eq("\x89PNG\r\n\x1A\n".b)
    end

    it 'returns payment_settings_missing without settings' do
      get "#{base}/#{make_order.id}/qr", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'agent of account A gets 404 for order of account B' do
      get "#{base}/#{make_order(other_account).id}/qr", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
