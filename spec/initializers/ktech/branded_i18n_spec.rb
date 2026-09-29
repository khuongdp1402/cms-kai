require 'rails_helper'

RSpec.describe Ktech::BrandedI18n do
  before do
    I18n.backend.store_translations(:en, ktech_spec: {
                                      plain: 'Hello there',
                                      branded: 'Welcome to Chatwoot',
                                      placeholder: 'Hi %{chatwoot_name}, open https://www.chatwoot.com in Chatwoot', # rubocop:disable Style/FormatStringToken
                                      nested: { deep: 'chatwoot inside' }
                                    })
    allow(GlobalConfig).to receive(:get_value).with('BRAND_NAME').and_return('KTech')
  end

  it 'replaces the product name in translated strings' do
    expect(I18n.t('ktech_spec.branded')).to eq('Welcome to KTech')
  end

  it 'keeps placeholders and URLs intact' do
    expect(I18n.t('ktech_spec.placeholder', chatwoot_name: 'Ana'))
      .to eq('Hi Ana, open https://www.chatwoot.com in KTech')
  end

  it 'does not query config for strings without the product name' do
    expect(I18n.t('ktech_spec.plain')).to eq('Hello there')
    expect(GlobalConfig).not_to have_received(:get_value)
  end

  it 'leaves non-string results untouched' do
    expect(I18n.t('ktech_spec.nested')).to eq(deep: 'chatwoot inside')
  end

  it 'keeps the original text when no brand is configured' do
    allow(GlobalConfig).to receive(:get_value).with('BRAND_NAME').and_return(nil)
    expect(I18n.t('ktech_spec.branded')).to eq('Welcome to Chatwoot')
  end
end
