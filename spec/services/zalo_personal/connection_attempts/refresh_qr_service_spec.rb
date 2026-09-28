# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ZaloPersonal::ConnectionAttempts::RefreshQrService do
  it 'reuses an active bridge flow instead of creating a competing QR code' do
    expiry = 90.seconds.from_now
    attempt = double(
      'ConnectionAttempt',
      consumed?: false,
      cancelled?: false,
      active?: true,
      bridge_session_id: 'qr_flow_123',
      expires_at: expiry
    )
    show_service = instance_double(ZaloPersonal::ConnectionAttempts::ShowService)

    allow(attempt).to receive(:with_lock) { |&block| block.call }
    allow(ZaloPersonal::ConnectionAttempts::ShowService).to receive(:new)
      .with(attempt: attempt)
      .and_return(show_service)
    allow(show_service).to receive(:perform).and_return(
      success: true,
      attempt: attempt,
      qr_data_url: 'data:image/png;base64,qr'
    )

    expect(ZaloPersonal::BridgeClient).not_to receive(:new)

    result = described_class.new(attempt: attempt).perform

    expect(result).to include(
      success: true,
      attempt: attempt,
      qr_data_url: 'data:image/png;base64,qr',
      expires_at: expiry,
      reused: true
    )
  end

  it 'creates a replacement flow after the previous attempt reaches a terminal state' do
    expiry = 2.minutes.from_now.change(usec: 0)
    attempt = double(
      'ConnectionAttempt',
      consumed?: false,
      cancelled?: false,
      active?: false,
      bridge_integration_id: 'zca_attempt_123',
      expires_at: expiry
    )
    bridge_client = instance_double(ZaloPersonal::BridgeClient)

    allow(attempt).to receive(:with_lock) { |&block| block.call }
    allow(ZaloPersonal::BridgeClient).to receive(:new).and_return(bridge_client)
    allow(bridge_client).to receive(:create_qr_flow).and_return(
      success: true,
      data: {
        'flow_id' => 'qr_flow_replacement',
        'status' => 'pending',
        'qr_data_url' => nil,
        'expires_at' => expiry.iso8601,
        'error_code' => nil
      }
    )

    expect(attempt).to receive(:update!).with(
      bridge_session_id: 'qr_flow_replacement',
      status: :pending,
      error_code: nil,
      expires_at: expiry
    )

    result = described_class.new(attempt: attempt).perform

    expect(result).to include(success: true, attempt: attempt, qr_data_url: nil, expires_at: expiry)
  end
end
