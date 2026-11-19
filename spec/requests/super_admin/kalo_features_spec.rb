require 'rails_helper'

# ADR-023: a Super Admin turns Kalo feature groups on/off per shop from the account page;
# the dashboard reads them from the account payload `features`.
RSpec.describe 'Super admin Kalo features', type: :request do
  let!(:super_admin) { create(:super_admin) }
  let!(:account) { create(:account) }
  let!(:admin) { create(:user, account: account, role: :administrator) }
  let(:path) { "/super_admin/accounts/#{account.id}/kalo_features" }

  before do
    allow_any_instance_of(ActionView::Base).to receive(:vite_javascript_tag).and_return('') # rubocop:disable RSpec/AnyInstance
    allow_any_instance_of(ActionView::Base).to receive(:vite_client_tag).and_return('') # rubocop:disable RSpec/AnyInstance
    account.enable_features!('help_center', 'kalo_pos', 'kalo_brand')
  end

  def kalo_states
    Kchat::Features.states(account.reload)
  end

  context 'when signed in as super admin' do
    include_context 'with super admin locale', :vi

    before { sign_in(super_admin, scope: :super_admin) }

    it 'shows a Vietnamese "Chức năng" section with one switch per Kalo flag reflecting its state' do
      get "/super_admin/accounts/#{account.id}"

      expect(response).to have_http_status(:ok)
      doc = Nokogiri::HTML(response.body)
      section = doc.at_css('#kalo-features')
      expect(section.text).to include('Chức năng', 'Bán hàng tại quầy (POS)', 'Trung tâm trợ giúp')
      expect(section.at_css('input[type=submit]')['value']).to eq('Lưu chức năng')
      expect(section.text).not_to match(/translation[ _]missing/i)
      Kchat::Features::ALL.each do |name|
        box = section.at_css("input[type=checkbox][name='kalo_features[]'][value='#{name}']")
        expect(box).to be_present, "#{name} switch missing"
        expect(box['checked'].present?).to eq(%w[kalo_pos kalo_brand].include?(name)), "#{name} checked state"
      end
    end

    it 'saves the chosen flags, keeps other feature flags and logs the change' do
      allow(Rails.logger).to receive(:info)

      patch path, params: { kalo_features: %w[kalo_help_center kalo_pos] }

      expect(response).to redirect_to("/super_admin/accounts/#{account.id}")
      expect(kalo_states.select { |_n, on| on }.keys).to contain_exactly('kalo_help_center', 'kalo_pos')
      expect(account.feature_enabled?('help_center')).to be(true)
      expect(Rails.logger).to have_received(:info).with(/\[kalo_features\].*#{super_admin.email}.*account=#{account.id}/)
    end

    it 'turns every Kalo flag off when no switch is checked' do
      patch path, params: { kalo_features: [''] }

      expect(kalo_states.values).to all(be(false))
    end

    it 'rejects unknown flag names without changing anything' do
      patch path, params: { kalo_features: %w[kalo_help_center help_center] }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(kalo_states.select { |_n, on| on }.keys).to contain_exactly('kalo_pos', 'kalo_brand')
    end

    it 'is reflected in the account payload the dashboard reads' do
      patch path, params: { kalo_features: %w[kalo_help_center kalo_pos] }

      get "/api/v1/accounts/#{account.id}", headers: admin.create_new_auth_token, as: :json

      features = response.parsed_body['features']
      expect(features).to include('kalo_help_center' => true, 'kalo_pos' => true, 'help_center' => true)
      expect(features).not_to have_key('kalo_brand')
    end
  end

  context 'with CSRF protection on (as in production)' do
    around do |example|
      original = ActionController::Base.allow_forgery_protection
      ActionController::Base.allow_forgery_protection = true
      example.run
    ensure
      ActionController::Base.allow_forgery_protection = original
    end

    before { sign_in(super_admin, scope: :super_admin) }

    it 'rejects a PATCH without a token and leaves flags unchanged' do
      patch path, params: { kalo_features: %w[kalo_help_center] }

      # ActionController::InvalidAuthenticityToken, rescued to 422 by ActionDispatch.
      expect(response).to have_http_status(:unprocessable_entity)
      expect(kalo_states.select { |_n, on| on }.keys).to contain_exactly('kalo_pos', 'kalo_brand')
    end

    it 'accepts a PATCH with the token rendered in the form' do
      get "/super_admin/accounts/#{account.id}"
      token = Nokogiri::HTML(response.body).at_css('#kalo-features input[name=authenticity_token]')['value']

      patch path, params: { kalo_features: %w[kalo_help_center], authenticity_token: token }

      expect(response).to redirect_to("/super_admin/accounts/#{account.id}")
      expect(kalo_states.select { |_n, on| on }.keys).to contain_exactly('kalo_help_center')
    end
  end

  context 'when not a super admin' do
    it 'redirects an anonymous visitor to the super admin login without changing flags' do
      patch path, params: { kalo_features: %w[kalo_help_center] }

      expect(response).to redirect_to('/super_admin/sign_in')
      expect(kalo_states.select { |_n, on| on }.keys).to contain_exactly('kalo_pos', 'kalo_brand')
    end

    it 'does not let a shop administrator change flags' do
      sign_in(admin, scope: :user)

      patch path, params: { kalo_features: %w[kalo_help_center] }, headers: admin.create_new_auth_token

      expect(response).to redirect_to('/super_admin/sign_in')
      expect(kalo_states.select { |_n, on| on }.keys).to contain_exactly('kalo_pos', 'kalo_brand')
    end
  end
end
