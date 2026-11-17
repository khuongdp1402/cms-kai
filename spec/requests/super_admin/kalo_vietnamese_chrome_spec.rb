require 'rails_helper'

# The super admin chrome (titles, column headers, values, actions, app config,
# settings cards) reads in Vietnamese when the installation locale is vi.
RSpec.describe 'Super admin Vietnamese chrome', type: :request do
  let!(:super_admin) { create(:super_admin) }
  let!(:account) { create(:account) }
  let!(:user) { create(:user, account: account, role: :agent) }

  before do
    allow_any_instance_of(ActionView::Base).to receive(:vite_javascript_tag).and_return('') # rubocop:disable RSpec/AnyInstance
    allow_any_instance_of(ActionView::Base).to receive(:vite_client_tag).and_return('') # rubocop:disable RSpec/AnyInstance
    sign_in(super_admin, scope: :super_admin)
  end

  # Visible text plus button values, without scripts and the navigation.
  def visible_text
    doc = Nokogiri::HTML(response.body)
    doc.css('script, style, svg').each(&:remove)
    buttons = doc.css('input[type=submit]').pluck('value')
    placeholders = doc.css('[placeholder]').pluck('placeholder')
    [doc.at('body').text, *buttons, *placeholders].join(' ').gsub(/\s+/, ' ')
  end

  def context_of(text, pattern)
    -> { text[/.{0,60}#{pattern.source}.{0,60}/] }
  end

  context 'when the installation locale is vi' do
    include_context 'with super admin locale', :vi

    it 'translates the accounts list: title, headers, filters and values' do
      get '/super_admin/accounts'
      text = visible_text
      expect(text).to include('Tài khoản shop', 'Mã', 'Tên', 'Ngôn ngữ', 'Người dùng', 'Hội thoại', 'Trạng thái', 'Đang hoạt động',
                              'Đã tạm ngưng', 'Tạo trong 30 ngày', 'Chờ xóa')
      expect(text).not_to match(/\b(Accounts|Locale|Status|Conversations|active|Marked For Deletion)\b/), context_of(text, /\b(Accounts|Locale|Status|Conversations|active|Marked For Deletion)\b/)
    end

    it 'translates the account page actions' do
      get "/super_admin/accounts/#{account.id}"
      text = visible_text
      expect(text).to include('Sửa', 'Thêm Nhân viên trong shop', 'Tạo dữ liệu mẫu', 'Xóa bộ nhớ đệm giao diện', 'Lịch sử tạm ngưng', 'Vai trò',
                              'Nhân viên')
      expect(text).not_to match(/\b(Edit|Create Account user|Generate Seed Data|Reset Frontend Cache|Suspension history|agent)\b/), context_of(text, /\b(Edit|Create Account user|Generate Seed Data|Reset Frontend Cache|Suspension history|agent)\b/)
    end

    it 'translates the account form' do
      get "/super_admin/accounts/#{account.id}/edit"
      text = visible_text
      expect(text).to include('Lưu Tài khoản shop', 'Đang hoạt động')
      expect(text).not_to match(/\b(Update Account|Active|Suspended)\b/), context_of(text, /\b(Update Account|Active|Suspended)\b/)
    end

    it 'translates the user page' do
      get "/super_admin/users/#{user.id}"
      text = visible_text
      expect(text).to include('Đăng nhập với tư cách người dùng', 'Tên hiển thị')
      expect(text).not_to match(/\b(Impersonate user|Caution|Display name|Created at)\b/), context_of(text, /\b(Impersonate user|Caution|Display name|Created at)\b/)
    end

    it 'translates app config pages' do
      get '/super_admin/app_config', params: { config: 'general' }
      text = visible_text
      expect(text).to include('Cấu hình - Chung', 'Lưu', 'Bật', 'Tắt', 'Cho phép tự đăng ký tài khoản')
      expect(text).not_to match(/\b(Configure Settings|Submit|True|False|Enable Account Signup)\b/), context_of(text, /\b(Configure Settings|Submit|True|False|Enable Account Signup)\b/)
    end

    it 'shows only community features on the settings page, in Vietnamese' do
      get '/super_admin/settings'
      text = visible_text
      expect(text).to include('Trung tâm trợ giúp', 'Chat trên website')
      expect(text).not_to match(/\b(EE|Captain|SAML|Audit Logs|Custom Branding|Voice Calls)\b/), context_of(text, /\b(EE|Captain|SAML|Audit Logs|Custom Branding|Voice Calls)\b/)
    end
  end

  context 'when the installation locale is en' do
    include_context 'with super admin locale', :en

    it 'keeps English chrome' do
      get "/super_admin/accounts/#{account.id}"
      expect(visible_text).to include('Edit', 'Generate seed data', 'Reset frontend cache')
      get '/super_admin/app_config', params: { config: 'general' }
      expect(visible_text).to include('Save', 'Enable Account Signup')
    end

    it 'hides enterprise cards and Captain on the settings page' do
      get '/super_admin/settings'
      expect(visible_text).to include('Help Center').and include('Live Chat')
      expect(visible_text).not_to match(/\b(EE|Captain|SAML)\b/), context_of(visible_text, /\b(EE|Captain|SAML)\b/)
    end
  end
end
