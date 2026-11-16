# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Console accounts API', type: :request do
  let(:super_admin) { create(:super_admin) }
  let(:headers) { super_admin.create_new_auth_token }
  let(:base) { '/api/v1/console/accounts' }
  let!(:trial) { create(:account, name: 'Trial Shop') }
  let!(:active) do
    create(:account, name: 'Active Shop', created_at: 60.days.ago,
                     custom_attributes: { 'subscription_plan' => 'growth', 'subscription_valid_until' => 20.days.from_now.iso8601 })
  end

  before do
    create(:account, name: 'Expiring Shop', created_at: 60.days.ago,
                     custom_attributes: { 'subscription_plan' => 'starter', 'subscription_valid_until' => 3.days.from_now.iso8601 })
    create(:account, name: 'Locked Shop', status: 'suspended')
  end

  def names(params = {})
    get base, params: params, headers: headers, as: :json
    response.parsed_body['payload'].pluck('name')
  end

  it 'agent and administrator get 403, SuperAdmin gets 200' do
    %i[agent administrator].each do |role|
      get base, headers: create(:user, account: trial, role: role).create_new_auth_token, as: :json
      expect(response).to have_http_status(:forbidden)
      patch "#{base}/#{trial.id}", params: { locked: true }, headers: create(:user, account: trial, role: role).create_new_auth_token, as: :json
      expect(response).to have_http_status(:forbidden)
    end
    expect(trial.reload).to be_active
    get base, headers: headers, as: :json
    expect(response).to have_http_status(:ok)
  end

  it 'lists accounts with meta and the account shape' do
    get base, headers: headers, as: :json
    expect(response.parsed_body['meta']).to eq('count' => 4, 'current_page' => 1, 'per_page' => 25)
    row = response.parsed_body['payload'].find { |a| a['id'] == active.id }
    expect(row).to include('name' => 'Active Shop', 'plan' => 'growth', 'status' => 'active', 'locked' => false, 'days_left' => 20)
    expect(row.keys).to contain_exactly('id', 'name', 'plan', 'status', 'valid_until', 'days_left', 'locked', 'created_at')
  end

  it 'filters by trial, expiring, locked and query' do
    expect(names(filter: 'trial')).to contain_exactly('Trial Shop', 'Locked Shop')
    expect(names(filter: 'expiring')).to eq(['Expiring Shop'])
    expect(names(filter: 'locked')).to eq(['Locked Shop'])
    expect(names(query: 'active')).to eq(['Active Shop'])
    expect(names(query: trial.id.to_s)).to eq(['Trial Shop'])
  end

  describe 'PATCH' do
    it 'locked true suspends the account and false restores it' do
      patch "#{base}/#{trial.id}", params: { locked: true }, headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(trial.reload).to be_suspended
      expect(response.parsed_body['locked']).to be(true)

      patch "#{base}/#{trial.id}", params: { locked: false }, headers: headers, as: :json
      expect(trial.reload).to be_active
    end

    it 'extend_days adds to the current valid_until, or to now when expired' do
      patch "#{base}/#{active.id}", params: { extend_days: 10 }, headers: headers, as: :json
      expect(Time.zone.parse(active.reload.custom_attributes['subscription_valid_until'])).to be_within(1.minute).of(30.days.from_now)

      patch "#{base}/#{trial.id}", params: { extend_days: 7 }, headers: headers, as: :json
      expect(Time.zone.parse(trial.reload.custom_attributes['subscription_valid_until'])).to be_within(1.minute).of(7.days.from_now)
      expect(response.parsed_body['status']).to eq('active')
    end

    it 'rejects a non-positive or non-integer extend_days with 422' do
      patch "#{base}/#{trial.id}", params: { extend_days: -5 }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      patch "#{base}/#{trial.id}", params: { extend_days: 'abc' }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(trial.reload.custom_attributes['subscription_valid_until']).to be_nil
    end

    it 'returns 404 for an unknown account' do
      patch "#{base}/0", params: { locked: true }, headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end
end
