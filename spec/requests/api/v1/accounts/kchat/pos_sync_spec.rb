require 'rails_helper'

RSpec.describe 'Kchat POS Sync API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:base) { "/api/v1/accounts/#{account.id}/kchat/pos_sync" }

  it 'requires administrator permission' do
    post "#{base}/products", params: { products: [] }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  describe 'POST /pos_sync/products' do
    it 'upserts catalog products from external POS payload' do
      post "#{base}/products", params: {
        products: [
          { external_id: 'POS-1', name: 'Phòng Suite', category: 'Khách sạn', availability_mode: 'preorder', price: 3_500_000 },
          { external_id: 'POS-2', name: 'Vé Đà Nẵng', category: 'Vé máy bay', availability_mode: 'preorder', price: 1_800_000 }
        ]
      }, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include('imported_count' => 2, 'created_count' => 2, 'updated_count' => 0)

      post "#{base}/products", params: {
        products: [{ external_id: 'POS-1', name: 'Phòng Suite VIP', price: 3_900_000, availability_mode: 'preorder' }]
      }, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include('updated_count' => 1)
      expect(Kchat::Product.find_by(account: account, external_id: 'POS-1').price).to eq(3_900_000)
    end
  end

  describe 'POST /pos_sync/orders' do
    it 'updates existing Kalo order status by number or creates external POS order with contact' do
      order = Kchat::Order.create_with_items!(
        account: account,
        attributes: { source: 'chat', payment_method: 'transfer_qr' },
        items: [{ name: 'Tour 3N2Đ', unit_price: 2_500_000, quantity: 1 }]
      )

      post "#{base}/orders", params: {
        number: order.number,
        external_id: 'POS-ORD-10',
        external_source: 'kiotviet',
        external_status: 'Đã xuất vé',
        status: 'paid',
        tracking_code: 'PNR-XY1'
      }, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['synced_count']).to eq(1)
      expect(order.reload).to have_attributes(
        status: 'paid', external_id: 'POS-ORD-10', external_source: 'kiotviet',
        external_status: 'Đã xuất vé', tracking_code: 'PNR-XY1'
      )

      post "#{base}/orders", params: {
        orders: [{
          external_id: 'POS-ORD-99',
          external_source: 'sapo',
          external_status: 'Hoàn tất tại POS',
          status: 'completed',
          customer: { name: 'Anh Hải', phone_number: '+84912345678' },
          items: [{ name: 'Booking Vinpearl', unit_price: 4_200_000, quantity: 1 }]
        }]
      }, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      created = Kchat::Order.find_by!(account: account, external_id: 'POS-ORD-99')
      expect(created).to have_attributes(source: 'external', status: 'completed', total: 4_200_000)
      expect(created.contact.phone_number).to eq('+84912345678')
    end
  end
end
