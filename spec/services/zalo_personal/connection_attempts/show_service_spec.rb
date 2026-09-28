# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ZaloPersonal::ConnectionAttempts::ShowService do
  let(:attempt) do
    instance_double(
      ZaloPersonal::ConnectionAttempt,
      authenticated?: false,
      consumed?: false,
      cancelled?: false,
      expired?: false,
      declined?: false,
      failed?: false,
      bridge_session_id: 'qr_flow_123',
      bridge_integration_id: 'integration_123',
      status: 'qr_ready'
    )
  end
  let(:bridge_client) { instance_double(ZaloPersonal::BridgeClient) }

  before do
    allow(ZaloPersonal::BridgeClient).to receive(:new).and_return(bridge_client)
  end

  it 'turns a missing process-local QR flow into a recoverable terminal state' do
    allow(bridge_client).to receive(:qr_flow_status).and_return(
      success: false,
      status: 404,
      error: 'QR flow not found or expired'
    )
    expect(attempt).to receive(:update!).with(status: :failed, error_code: 'qr_flow_unavailable')

    result = described_class.new(attempt: attempt).perform

    expect(result).to include(success: true, attempt: attempt)
  end

  it 'persists a stable error code when Zalo login fails' do
    allow(bridge_client).to receive(:qr_flow_status).and_return(
      success: true,
      status: 200,
      data: {
        'status' => 'failed',
        'qr_data_url' => nil,
        'error_code' => 'zalo_login_incomplete'
      }
    )
    expect(attempt).to receive(:update!).with(
      status: :failed,
      error_code: 'zalo_login_incomplete'
    )

    result = described_class.new(attempt: attempt).perform

    expect(result).to include(success: true, attempt: attempt, qr_data_url: nil)
  end

  it 'does not call the bridge again after an attempt has failed' do
    allow(attempt).to receive(:failed?).and_return(true)
    expect(ZaloPersonal::BridgeClient).not_to receive(:new)

    result = described_class.new(attempt: attempt).perform

    expect(result).to include(success: true, attempt: attempt)
  end

  it 'persists the expired status when the attempt lifetime has elapsed' do
    allow(attempt).to receive(:expired?).and_return(true)
    expect(attempt).to receive(:update!).with(status: :expired)
    expect(ZaloPersonal::BridgeClient).not_to receive(:new)

    result = described_class.new(attempt: attempt).perform

    expect(result).to include(success: true, attempt: attempt)
  end
end
