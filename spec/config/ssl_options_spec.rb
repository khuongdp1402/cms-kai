require 'rails_helper'

RSpec.describe 'config.ssl_options' do # rubocop:disable RSpec/DescribeClass
  let(:app) { ->(_env) { [200, { 'Content-Type' => 'text/plain' }, ['ok']] } }
  let(:stack) { ActionDispatch::SSL.new(app, **Rails.application.config.ssl_options) }

  def call(path, **)
    stack.call(Rack::MockRequest.env_for("http://example.com#{path}", **))
  end

  it 'serves /health over plain http (container healthcheck)' do
    expect(call('/health').first).to eq(200)
  end

  it 'still redirects other plain-http paths to https' do
    status, headers, = call('/app/login')
    expect(status).to eq(301)
    expect(Rack::Headers[headers]['location']).to eq('https://example.com/app/login')
  end

  it 'does not redirect when nginx forwards X-Forwarded-Proto https' do
    expect(call('/app/login', 'HTTP_X_FORWARDED_PROTO' => 'https').first).to eq(200)
  end

  it 'keeps HSTS on https responses' do
    _status, headers, = call('/app/login', 'HTTP_X_FORWARDED_PROTO' => 'https')
    expect(Rack::Headers[headers]['strict-transport-security']).to be_present
  end
end
