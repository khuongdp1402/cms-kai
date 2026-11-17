# Forces the locale the super admin renders in (SuperAdmin::KaloLocale reads DEFAULT_LOCALE).
RSpec.shared_context 'with super admin locale' do |locale|
  before do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with('DEFAULT_LOCALE', 'vi').and_return(locale.to_s)
  end
end
