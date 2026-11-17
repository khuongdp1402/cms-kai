require 'rails_helper'

# Presentation-layer guard for the Kalo-styled super admin (ADR-020):
# every page renders for a SuperAdmin, shows Kalo chrome and no Chatwoot branding.
RSpec.describe 'Super admin Kalo style', type: :request do
  let!(:super_admin) { create(:super_admin) }
  let!(:account) { create(:account) }
  let!(:user) { create(:user, account: account) }
  let!(:agent_bot) { create(:agent_bot) }
  let!(:platform_app) { create(:platform_app) }
  let!(:installation_config) { create(:installation_config, name: 'KALO_STYLE_SPEC', locked: false) }
  let!(:access_token) { user.access_token }
  let!(:account_user) { account.account_users.first }

  # The Vite test build is not available in the dev container (known upstream failures),
  # so the asset tags are stubbed; this spec checks the server-rendered markup only.
  before do
    allow_any_instance_of(ActionView::Base).to receive(:vite_javascript_tag).and_return('') # rubocop:disable RSpec/AnyInstance
    allow_any_instance_of(ActionView::Base).to receive(:vite_client_tag).and_return('') # rubocop:disable RSpec/AnyInstance
  end

  def expect_kalo_page
    expect(response).to have_http_status(:ok)
    expect(response.body).to include('kalo-nav')
    expect(response.body).not_to include('Chatwoot'), -> { "#{request.path}: #{response.body[/.{80}Chatwoot.{80}/m]}" }
  end

  describe 'login page' do
    it 'renders the Kalo login without Chatwoot branding' do
      get '/super_admin/sign_in'
      expect(response).to have_http_status(:ok)
      expect(response.body).to include('kalo-login')
      expect(response.body).not_to include('Chatwoot')
    end
  end

  context 'when signed in as super admin' do
    before { sign_in(super_admin, scope: :super_admin) }

    {
      accounts: -> { account },
      users: -> { user },
      agent_bots: -> { agent_bot },
      platform_apps: -> { platform_app },
      installation_configs: -> { installation_config },
      access_tokens: -> { access_token }
    }.each do |resource, record|
      it "renders #{resource} index and show" do
        get "/super_admin/#{resource}"
        expect_kalo_page
        get "/super_admin/#{resource}/#{instance_exec(&record).id}"
        expect_kalo_page
      end
    end

    it 'redirects account_users show to the user page, which renders' do
      get "/super_admin/account_users/#{account_user.id}"
      expect(response).to redirect_to("/super_admin/users/#{account_user.user_id}")
      follow_redirect!
      expect_kalo_page
    end

    it 'renders platform banners when the cloud flag is on' do
      allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(true)
      banner = PlatformBanner.create!(banner_message: 'Bảo trì', banner_type: 0)
      get '/super_admin/platform_banners'
      expect_kalo_page
      get "/super_admin/platform_banners/#{banner.id}"
      expect_kalo_page
    end

    it 'renders instance status, settings, push diagnostics, app config and dashboard' do
      %w[instance_status settings push_diagnostics app_config].each do |path|
        get "/super_admin/#{path}"
        expect_kalo_page
      end
      get '/super_admin'
      expect_kalo_page
    end

    it 'renders every app config page listed in the settings menu' do
      keys = SuperAdmin::FeaturesHelper.available_features.values.filter_map { |attrs| attrs['config_key'] if attrs['enabled'] }
      (['general'] + keys).uniq.each do |config|
        get '/super_admin/app_config', params: { config: config }
        expect_kalo_page
      end
    end

    it 'renders the brand name and the reduced navigation' do
      get '/super_admin/accounts'
      expect(response.body).to include(SuperAdmin::KaloNavigation.brand_name)
      %w[accounts users agent_bots platform_apps access_tokens installation_configs instance_status].each do |key|
        expect(response.body).to include(I18n.t("kalo_super_admin.nav.#{key}"))
      end
      expect(response.body).not_to include('Sidekiq Dashboard')
    end

    it 'shows an empty state when a search has no results' do
      get '/super_admin/accounts', params: { search: 'zzz-no-such-account-zzz' }
      expect(response).to have_http_status(:ok)
      expect(response.body).to include('kalo-empty')
    end
  end

  describe 'Vietnamese chrome' do
    it 'ships Vietnamese labels for the visible chrome' do
      expect(I18n.t('kalo_super_admin.nav.accounts', locale: :vi)).to eq('Tài khoản shop')
      expect(I18n.t('kalo_super_admin.search.placeholder', locale: :vi, resource: 'Tài khoản')).to eq('Tìm trong Tài khoản')
    end
  end
end
