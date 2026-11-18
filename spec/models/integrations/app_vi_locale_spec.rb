require 'rails_helper'

RSpec.describe Integrations::App do
  describe 'Vietnamese descriptions (config/locales/vi_kalo_integration_apps.yml)' do
    let(:apps) { described_class.all }
    let(:fields) { %i[description short_description] }

    it 'translates every description and short description' do
      untranslated = apps.flat_map do |app|
        fields.filter_map do |field|
          english = I18n.with_locale(:en) { app.public_send(field) }
          next if english.blank? || english.start_with?('Translation missing')

          vietnamese = I18n.with_locale(:vi) { app.public_send(field) }
          "#{app.id}.#{field}" if vietnamese == english
        end
      end

      expect(untranslated).to eq([])
    end
  end
end
