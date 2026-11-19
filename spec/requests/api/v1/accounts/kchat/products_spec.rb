require 'rails_helper'

RSpec.describe 'Kchat products API', type: :request do
  let(:account) { create(:account) }
  let(:other_account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:base) { "/api/v1/accounts/#{account.id}/kchat/products" }
  let!(:product) { Kchat::Product.create!(account: account, name: 'Áo thun', price: 150_000, stock: 5, sku: 'AT1') }
  let!(:foreign) { Kchat::Product.create!(account: other_account, name: 'Hàng lạ', price: 1000) }

  it 'requires authentication' do
    get base
    expect(response).to have_http_status(:unauthorized)
  end

  describe 'GET index' do
    it 'lists only own account products in the contract shape' do
      Kchat::Product.create!(account: account, name: 'Quần', price: 1, active: false)
      get base, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:ok)
      names = response.parsed_body['payload'].pluck('name')
      expect(names).to contain_exactly('Áo thun', 'Quần')
      expect(response.parsed_body['payload'].first.keys).to contain_exactly('id', 'name', 'sku', 'price', 'stock', 'active', 'image_url')
    end

    it 'filters by query and active' do
      Kchat::Product.create!(account: account, name: 'Quần', price: 1, active: false)
      get base, params: { query: 'áo' }, headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body['payload'].pluck('name')).to eq(['Áo thun'])
      get base, params: { active: 'false' }, headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body['payload'].pluck('name')).to eq(['Quần'])
    end
  end

  describe 'POST create' do
    it 'creates a product and ignores non-contract fields' do
      post base, params: { name: 'Mũ', price: 20_000, stock: nil, id: 999_999, account_id: other_account.id, created_at: '2000-01-01' },
                 headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:created)
      created = Kchat::Product.find(response.parsed_body['id'])
      expect(created).to have_attributes(account_id: account.id, name: 'Mũ', price: 20_000, stock: nil)
      expect(created.id).not_to eq(999_999)
      expect(created.created_at.year).to eq(Time.current.year)
    end

    it 'price below 0 returns 422' do
      post base, params: { name: 'Mũ', price: -1 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(Kchat::Product.where(name: 'Mũ')).to be_empty
    end

    it 'accepts an image upload' do
      post base, params: { name: 'Ảnh', price: 1, image: fixture_file_upload(Rails.root.join('spec/assets/avatar.png'), 'image/png') },
                 headers: admin.create_new_auth_token
      expect(response).to have_http_status(:created)
      expect(response.parsed_body['image_url']).to be_present
    end
  end

  describe 'image validation' do
    it 'rejects a non image file' do
      post base, params: { name: 'Tệp', price: 1, image: fixture_file_upload(Rails.root.join('spec/assets/sample.pdf'), 'application/pdf') },
                 headers: admin.create_new_auth_token
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('validation_failed')
      expect(Kchat::Product.where(name: 'Tệp')).to be_empty
    end

    it 'rejects an image over 5 MB' do
      big = Tempfile.new(['big', '.png'], binmode: true)
      big.write("\x89PNG\r\n\x1A\n".b + ('0' * (5.megabytes + 1)))
      big.rewind
      post base, params: { name: 'Lớn', price: 1, image: Rack::Test::UploadedFile.new(big.path, 'image/png') }, headers: admin.create_new_auth_token
      expect(response).to have_http_status(:unprocessable_entity)
      expect(Kchat::Product.where(name: 'Lớn')).to be_empty
    ensure
      big&.close!
    end
  end

  describe 'PATCH update' do
    it 'updates a product' do
      patch "#{base}/#{product.id}", params: { price: 99_000, stock: 3 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:ok)
      expect(product.reload).to have_attributes(price: 99_000, stock: 3)
    end

    it 'administrator of account A gets 404 for product of account B' do
      patch "/api/v1/accounts/#{account.id}/kchat/products/#{foreign.id}", params: { price: 1 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.price).to eq(1000)
    end

    it 'is unauthorized when addressing another account directly' do
      patch "/api/v1/accounts/#{other_account.id}/kchat/products/#{foreign.id}", params: { price: 1 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(foreign.reload.price).to eq(1000)
    end
  end

  describe 'DELETE destroy' do
    it 'agent cannot delete product, administrator can' do
      delete "#{base}/#{product.id}", headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(Kchat::Product.exists?(product.id)).to be true

      delete "#{base}/#{product.id}", headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:no_content)
      expect(Kchat::Product.exists?(product.id)).to be false
    end

    it 'administrator of account A gets 404 for product of account B' do
      delete "#{base}/#{foreign.id}", headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:not_found)
      expect(Kchat::Product.exists?(foreign.id)).to be true
    end
  end

  describe 'agents are read-only' do
    it 'agent cannot create, update or adjust stock' do
      post base, params: { name: 'Mũ', price: 1 }, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(Kchat::Product.where(name: 'Mũ')).to be_empty

      patch "#{base}/#{product.id}", params: { price: 1 }, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unauthorized)

      post "#{base}/#{product.id}/adjust_stock", params: { delta: 3 }, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(product.reload).to have_attributes(price: 150_000, stock: 5)
    end
  end

  describe 'expired subscription' do
    before { account.update_columns(created_at: 30.days.ago) } # rubocop:disable Rails/SkipsModelValidations

    it 'blocks update and stock adjustment with 403 but still lists' do
      patch "#{base}/#{product.id}", params: { price: 1 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body['error']).to eq('subscription_expired')

      post "#{base}/#{product.id}/adjust_stock", params: { delta: 1 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(product.reload).to have_attributes(price: 150_000, stock: 5)

      get base, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:ok)
    end
  end

  describe 'POST adjust_stock' do
    let(:url) { "#{base}/#{product.id}/adjust_stock" }

    it 'adds and removes stock relative to the current amount' do
      post url, params: { delta: 4 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['stock']).to eq(9)

      post url, params: { delta: -9 }, headers: admin.create_new_auth_token, as: :json
      expect(product.reload.stock).to eq(0)
    end

    it 'starts tracking stock for a product without stock' do
      untracked = Kchat::Product.create!(account: account, name: 'Dịch vụ', price: 1)
      post "#{base}/#{untracked.id}/adjust_stock", params: { delta: 2 }, headers: admin.create_new_auth_token, as: :json
      expect(untracked.reload.stock).to eq(2)
    end

    it 'refuses to go below zero or a non integer delta' do
      post url, params: { delta: -6 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('insufficient_stock')

      post url, params: { delta: 'abc' }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(product.reload.stock).to eq(5)
    end

    it 'rejects underscore syntax and a stock outside the integer column range' do
      ['1_000', '99999999999', 99_999_999_999].each do |delta|
        post url, params: { delta: delta }, headers: admin.create_new_auth_token, as: :json
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body['error']).to eq('validation_failed')
      end
      expect(product.reload.stock).to eq(5)
    end

    it 'returns 404 for a product of another account' do
      post "#{base}/#{foreign.id}/adjust_stock", params: { delta: 1 }, headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.stock).to be_nil
    end
  end

  describe 'archiving a product used by orders' do
    let!(:order) do
      Kchat::Order.create_with_items!(account: account, attributes: { source: 'manual', payment_method: 'cash' },
                                      items: [{ product_id: product.id, quantity: 2 }])
    end

    it 'DELETE archives instead of deleting and keeps the order history' do
      delete "#{base}/#{product.id}", headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include('id' => product.id, 'active' => false)
      expect(product.reload.active).to be false
      expect(order.items.reload.first).to have_attributes(product_id: product.id, name: 'Áo thun', unit_price: 150_000)

      get "/api/v1/accounts/#{account.id}/kchat/orders/#{order.id}", headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body.to_json).to include('Áo thun')
    end

    it 'hides the archived product from the POS / order form list and refuses new orders with it' do
      product.update!(active: false)
      get base, params: { active: true }, headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body['payload'].pluck('id')).not_to include(product.id)

      post "/api/v1/accounts/#{account.id}/kchat/orders",
           params: { source: 'pos', payment_method: 'cash', items: [{ product_id: product.id, quantity: 1 }] },
           headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('product_inactive')
    end

    it 'can be restored by setting active back' do
      product.update!(active: false)
      patch "#{base}/#{product.id}", params: { active: true }, headers: admin.create_new_auth_token, as: :json
      expect(product.reload.active).to be true
    end
  end
end
