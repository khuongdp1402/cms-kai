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
                 headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:created)
      created = Kchat::Product.find(response.parsed_body['id'])
      expect(created).to have_attributes(account_id: account.id, name: 'Mũ', price: 20_000, stock: nil)
      expect(created.id).not_to eq(999_999)
      expect(created.created_at.year).to eq(Time.current.year)
    end

    it 'price below 0 returns 422' do
      post base, params: { name: 'Mũ', price: -1 }, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(Kchat::Product.where(name: 'Mũ')).to be_empty
    end

    it 'accepts an image upload' do
      post base, params: { name: 'Ảnh', price: 1, image: fixture_file_upload(Rails.root.join('spec/assets/avatar.png'), 'image/png') },
                 headers: agent.create_new_auth_token
      expect(response).to have_http_status(:created)
      expect(response.parsed_body['image_url']).to be_present
    end
  end

  describe 'PATCH update' do
    it 'updates a product' do
      patch "#{base}/#{product.id}", params: { price: 99_000, stock: 3 }, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:ok)
      expect(product.reload).to have_attributes(price: 99_000, stock: 3)
    end

    it 'agent of account A gets 404 for product of account B' do
      patch "/api/v1/accounts/#{account.id}/kchat/products/#{foreign.id}", params: { price: 1 }, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.price).to eq(1000)
    end

    it 'is unauthorized when addressing another account directly' do
      patch "/api/v1/accounts/#{other_account.id}/kchat/products/#{foreign.id}", params: { price: 1 }, headers: agent.create_new_auth_token, as: :json
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
end
