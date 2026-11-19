# frozen_string_literal: true

# What each channel really reports back for a broadcast, so the campaign UI never shows numbers a channel cannot give.
module Kchat::Broadcasts::Channels
  META_24H_CHANNELS = %w[Channel::FacebookPage Channel::Instagram].freeze

  # Channels whose provider tells Chatwoot that a message was read (Messenger/Instagram read webhooks,
  # WhatsApp statuses, TikTok read events, the web widget's contact_last_seen_at).
  # Zalo personal is absent: the bridge contract has `message.read` but the zca-js adapter never emits it.
  READ_STATUS_CHANNELS = %w[Channel::FacebookPage Channel::Instagram Channel::Whatsapp Channel::Tiktok Channel::WebWidget].freeze

  # Mirrors zalo-personal-bridge/src/config/limits.ts (ACCOUNT_SENDS_PER_MINUTE, ACCOUNT_BURST_MAX).
  ZALO_PERSONAL_RATE = { per_minute: 30, burst: 10 }.freeze

  module_function

  def capabilities(channel_type)
    {
      requires_24h_window: META_24H_CHANNELS.include?(channel_type),
      read_status: READ_STATUS_CHANNELS.include?(channel_type),
      rate_limit: channel_type == 'Channel::ZaloPersonal' ? ZALO_PERSONAL_RATE : nil
    }
  end
end
