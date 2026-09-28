# frozen_string_literal: true

require 'openssl'

class ZaloPersonal::RequestSigner
  def self.sign(secret:, key_id:, timestamp:, nonce:, body:)
    payload = "#{timestamp}.#{nonce}.#{body}"
    signature = OpenSSL::HMAC.hexdigest('SHA256', secret, payload)
    {
      'X-Zalo-Personal-Key-Id' => key_id.to_s,
      'X-Zalo-Personal-Timestamp' => timestamp.to_s,
      'X-Zalo-Personal-Nonce' => nonce.to_s,
      'X-Zalo-Personal-Signature' => signature
    }
  end

  def self.verify(secret:, signature:, timestamp_str:, nonce:, body:, max_skew_seconds: 60)
    return false if signature.blank? || timestamp_str.blank? || nonce.blank?

    timestamp = timestamp_str.to_i
    now = Time.current.to_i
    return false if (now - timestamp).abs > max_skew_seconds

    payload = "#{timestamp_str}.#{nonce}.#{body}"
    expected_signature = OpenSSL::HMAC.hexdigest('SHA256', secret, payload)

    ActiveSupport::SecurityUtils.secure_compare(signature, expected_signature)
  end
end
