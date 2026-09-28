# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ZaloPersonal::RequestSigner do
  let(:secret) { 'test_secret_1234567890_32bytes_long' }
  let(:body) { '{"event_id":"evt_123","type":"message.created"}' }
  let(:timestamp) { Time.current.to_i.to_s }
  let(:nonce) { 'test_nonce_999' }

  describe '.sign and .verify' do
    it 'signs and verifies payload successfully' do
      headers = described_class.sign(
        secret: secret,
        key_id: 'k1',
        timestamp: timestamp,
        nonce: nonce,
        body: body
      )

      expect(headers['X-Zalo-Personal-Signature']).to be_present

      is_valid = described_class.verify(
        secret: secret,
        signature: headers['X-Zalo-Personal-Signature'],
        timestamp_str: timestamp,
        nonce: nonce,
        body: body
      )

      expect(is_valid).to be true
    end

    it 'returns false on tampered body' do
      headers = described_class.sign(
        secret: secret,
        key_id: 'k1',
        timestamp: timestamp,
        nonce: nonce,
        body: body
      )

      is_valid = described_class.verify(
        secret: secret,
        signature: headers['X-Zalo-Personal-Signature'],
        timestamp_str: timestamp,
        nonce: nonce,
        body: '{"tampered":true}'
      )

      expect(is_valid).to be false
    end
  end
end
