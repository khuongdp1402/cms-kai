# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ZaloPersonal::ConnectionAttempts::CreateService do
  let(:account) { double('Account') }
  let(:user) { double('User') }
  let(:attempts) { double('ConnectionAttemptsAssociation') }
  let(:active_attempts) { double('ActiveConnectionAttempts') }
  let(:ordered_attempts) { double('OrderedConnectionAttempts') }

  before do
    allow(account).to receive(:with_lock) { |&block| block.call }
    allow(account).to receive(:zalo_personal_connection_attempts).and_return(attempts)
    allow(attempts).to receive(:active).and_return(active_attempts)
    allow(active_attempts).to receive(:where)
      .with(requested_by: user, purpose: :create_channel)
      .and_return(active_attempts)
    allow(active_attempts).to receive(:where)
      .with(target_inbox_id: nil)
      .and_return(active_attempts)
    allow(active_attempts).to receive(:order)
      .with(created_at: :desc)
      .and_return(ordered_attempts)
  end

  it 'reuses the active attempt while holding the account lock' do
    expires_at = 90.seconds.from_now
    attempt = instance_double(
      ZaloPersonal::ConnectionAttempt,
      active?: true,
      bridge_session_id: 'qr_flow_123',
      expires_at: expires_at
    )
    show_service = instance_double(ZaloPersonal::ConnectionAttempts::ShowService)

    allow(ordered_attempts).to receive(:first).and_return(attempt)
    allow(ZaloPersonal::ConnectionAttempts::ShowService).to receive(:new)
      .with(attempt: attempt)
      .and_return(show_service)
    allow(show_service).to receive(:perform).and_return(
      success: true,
      attempt: attempt,
      qr_data_url: 'data:image/png;base64,qr'
    )

    expect(attempts).not_to receive(:create!)
    expect(ZaloPersonal::BridgeClient).not_to receive(:new)

    result = described_class.new(account: account, user: user).perform

    expect(result).to include(
      success: true,
      attempt: attempt,
      qr_data_url: 'data:image/png;base64,qr',
      expires_at: expires_at,
      reused: true
    )
  end

  it 'persists the actual initial bridge status and error code' do
    expiry = 2.minutes.from_now.change(usec: 0)
    attempt = instance_double(
      ZaloPersonal::ConnectionAttempt,
      bridge_integration_id: 'zca_attempt_123',
      expires_at: expiry
    )
    bridge_client = instance_double(ZaloPersonal::BridgeClient)

    allow(ordered_attempts).to receive(:first).and_return(nil)
    allow(attempts).to receive(:create!).and_return(attempt)
    allow(ZaloPersonal::BridgeClient).to receive(:new).and_return(bridge_client)
    allow(bridge_client).to receive(:create_qr_flow).and_return(
      success: true,
      data: {
        'flow_id' => 'qr_flow_123',
        'status' => 'failed',
        'qr_data_url' => nil,
        'expires_at' => expiry.iso8601,
        'error_code' => 'zalo_login_failed'
      }
    )

    expect(attempt).to receive(:update!).with(
      bridge_session_id: 'qr_flow_123',
      status: :failed,
      error_code: 'zalo_login_failed',
      expires_at: expiry
    )

    result = described_class.new(account: account, user: user).perform

    expect(result).to include(success: true, attempt: attempt, qr_data_url: nil, expires_at: expiry)
  end

  it 'fails an orphan pending attempt before creating a replacement flow' do
    orphan = instance_double(ZaloPersonal::ConnectionAttempt, bridge_session_id: nil)
    replacement = instance_double(
      ZaloPersonal::ConnectionAttempt,
      bridge_integration_id: 'zca_replacement_123'
    )
    bridge_client = instance_double(ZaloPersonal::BridgeClient)

    allow(ordered_attempts).to receive(:first).and_return(orphan, nil)
    allow(attempts).to receive(:create!).and_return(replacement)
    allow(ZaloPersonal::BridgeClient).to receive(:new).and_return(bridge_client)
    allow(bridge_client).to receive(:create_qr_flow).and_return(success: false, error: 'bridge unavailable')

    expect(orphan).to receive(:update!).with(status: :failed, error_code: 'qr_flow_unavailable')
    expect(replacement).to receive(:update!).with(status: :failed, error_code: 'bridge unavailable')

    result = described_class.new(account: account, user: user).perform

    expect(result).to eq(success: false, error: 'bridge unavailable')
  end
end
