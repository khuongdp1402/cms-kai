# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Console Mail Inspector API', type: :request do
  let(:super_admin) { create(:super_admin) }
  let(:url) { '/api/v1/console/mail_inspector' }

  it 'restricts access to SuperAdmin users' do
    account = create(:account)
    agent = create(:user, account: account, role: :administrator)

    get url, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:forbidden)
  end

  it 'parses MailHog v2 messages, UTF-8 headers, bodies, and activation links' do
    raw_mime = <<~MIME
      From: Kalo <noreply@kalo.local>
      To: owner@shop.vn
      Subject: =?UTF-8?B?W0thbG9dIFjDoWMgdGjhu7FjIHTDoGkga2hv4bqjbg==?=
      MIME-Version: 1.0
      Content-Type: text/html; charset=UTF-8

      <p>Vui lòng nhấn <a href="http://localhost:3005/app/auth/confirmation?confirmation_token=abc123">xác thực</a>.</p>
    MIME

    mock_response = instance_double(
      Net::HTTPSuccess,
      body: {
        items: [
          {
            'ID' => 'msg-1',
            'Created' => '2026-11-19T16:00:00Z',
            'From' => { 'Mailbox' => 'noreply', 'Domain' => 'kalo.local' },
            'To' => [{ 'Mailbox' => 'owner', 'Domain' => 'shop.vn' }],
            'Raw' => { 'Data' => raw_mime }
          }
        ]
      }.to_json
    )
    allow(mock_response).to receive(:is_a?).with(Net::HTTPSuccess).and_return(true)
    http_double = instance_double(Net::HTTP)
    allow(Net::HTTP).to receive(:new).and_return(http_double)
    allow(http_double).to receive(:use_ssl=)
    allow(http_double).to receive(:open_timeout=)
    allow(http_double).to receive(:read_timeout=)
    allow(http_double).to receive(:request).and_return(mock_response)

    get url, headers: super_admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    expect(body['reachable']).to be(true)
    expect(body['total']).to eq(1)
    item = body['items'].first
    expect(item['id']).to eq('msg-1')
    expect(item['to']).to eq(['owner@shop.vn'])
    expect(item['subject']).to include('Xác thực')
    expect(item['action_links']).to include('http://localhost:3005/app/auth/confirmation?confirmation_token=abc123')
  end

  it 'decodes quoted-printable emails even when MailHog strips trailing CRLF' do
    raw_mime = "From: noreply@kalo.local\r\nTo: admin@kalo.local\r\nSubject: Test\r\nMime-Version: 1.0\r\n" \
               "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n" \
               'X=C3=A1c th=E1=BB=B1c t=E1=BA=A1i http://localhost:3005/app/login='
    parsed = Kchat::MailhogClient.new.send(:parse_item, { 'ID' => 'qp-1', 'Raw' => { 'Data' => raw_mime } })
    expect(parsed[:text_body]).to eq('Xác thực tại http://localhost:3005/app/login')
    expect(parsed[:action_links]).to eq(['http://localhost:3005/app/login'])
  end
end
