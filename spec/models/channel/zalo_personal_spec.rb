# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Channel::ZaloPersonal, type: :model do
  let(:account) { create(:account) }
  let(:channel) { create(:channel_zalo_personal, account: account) }

  describe 'validations' do
    it 'creates a valid channel' do
      expect(channel).to be_valid
      expect(channel.identifier).to be_present
      expect(channel.signing_secret).to be_present
    end
  end

  describe '#reply_available?' do
    it 'returns true when connected and enabled' do
      channel.mark_connected!
      expect(channel.reply_available?).to be true
    end

    it 'returns false when disconnected' do
      channel.disconnect!
      expect(channel.reply_available?).to be false
    end
  end
end
