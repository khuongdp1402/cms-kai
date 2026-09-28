# frozen_string_literal: true

class ZaloPersonal::ReplayGuard
  NONCE_PREFIX = 'zalo_personal:nonce:'
  DEFAULT_TTL = 300 # 5 minutes

  def self.valid_nonce?(nonce, ttl = DEFAULT_TTL)
    return false if nonce.blank?

    key = "#{NONCE_PREFIX}#{nonce}"
    # Redis::Alfred.set returns true if key was set (was not existing), false otherwise with nx: true
    is_fresh = Redis::Alfred.set(key, 1, ex: ttl, nx: true)
    !!is_fresh
  end
end
