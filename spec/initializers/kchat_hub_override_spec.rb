// spec/initializers/kchat_hub_override_spec.rb
# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'KChat Hub Override' do
  describe ChatwootHub do
    it 'does not raise when sync_with_hub is called' do
      expect { described_class.new.sync_with_hub }.not_to raise_error
    end

    it 'returns nil for sync_with_hub' do
      expect(described_class.new.sync_with_hub).to be_nil
    end

    it 'does not raise when notify is called' do
      expect { described_class.new.notify(account: double, event_name: 'test') }.not_to raise_error
    end
  end
end
