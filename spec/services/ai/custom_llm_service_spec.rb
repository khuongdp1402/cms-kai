# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Ai::CustomLlmService do
  subject(:service) { described_class.new(api_key: 'test_key', endpoint: 'https://agentgw.cloud/v1', provider: 'agentgw') }

  it 'strips <think> blocks' do
    expect(described_class.strip_think("<think>x</think>\nChào bạn")).to eq('Chào bạn')
  end

  it 'replaces hard-banned phrases' do
    check = service.enforce_brand_guardrails('Cam kết trị khỏi 100% và cam kết vĩnh viễn.', ['trị khỏi 100%'])

    expect(check[:blocked_phrases]).to contain_exactly('trị khỏi 100%', 'cam kết vĩnh viễn')
    expect(check[:sanitized_text]).not_to include('trị khỏi 100%')
  end

  it 'raises when no API key is configured' do
    expect { described_class.new(api_key: '', provider: 'agentgw').complete([]) }
      .to raise_error(described_class::NotConfiguredError)
  end

  it 'raises on provider errors instead of returning a fake reply' do
    stub_request(:post, 'https://agentgw.cloud/v1/chat/completions').to_return(status: 500)

    expect { service.complete([{ role: 'user', content: 'hi' }]) }.to raise_error(described_class::ProviderError, /HTTP 500/)
  end

  it 'raises ProviderError when the provider rejects the key' do
    stub_request(:post, 'https://agentgw.cloud/v1/chat/completions').to_return(status: 401)

    expect { service.complete([{ role: 'user', content: 'hi' }]) }.to raise_error(described_class::ProviderError, /HTTP 401/)
  end

  [Net::OpenTimeout, Net::ReadTimeout, Errno::ECONNREFUSED, SocketError].each do |network_error|
    it "raises ProviderError on #{network_error}" do
      stub_request(:post, 'https://agentgw.cloud/v1/chat/completions').to_raise(network_error)

      expect { service.complete([{ role: 'user', content: 'hi' }]) }.to raise_error(described_class::ProviderError)
    end
  end

  it 'raises ProviderError when the provider answers with a non-JSON body' do
    stub_request(:post, 'https://agentgw.cloud/v1/chat/completions').to_return(status: 200, body: '<html>gateway</html>')

    expect { service.complete([{ role: 'user', content: 'hi' }]) }.to raise_error(described_class::ProviderError)
  end

  it 'sends the Gemini key in a header, not in the URL' do
    stub = stub_request(:post, %r{generativelanguage.googleapis.com/v1beta/models/.+:generateContent\z})
           .with(headers: { 'x-goog-api-key' => 'g-key' })
           .to_return(status: 200, body: { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }.to_json)

    with_modified_env(GEMINI_API_KEY: 'g-key') do
      expect(described_class.new(provider: 'gemini_api').complete([{ role: 'user', content: 'hi' }])).to eq('ok')
    end
    expect(stub).to have_been_requested
  end

  it 'refuses a prompt over the maximum total size before calling the provider' do
    request = stub_request(:post, 'https://agentgw.cloud/v1/chat/completions')
    huge = [{ role: 'user', content: 'a' * (described_class::MAX_PROMPT_CHARS + 1) }]

    expect { service.complete(huge) }.to raise_error(described_class::PromptTooLargeError)
    expect(request).not_to have_been_requested
  end

  it 'accepts a prompt exactly at the maximum total size' do
    stub_request(:post, 'https://agentgw.cloud/v1/chat/completions').to_return(
      status: 200, headers: { 'Content-Type' => 'application/json' }, body: { choices: [{ message: { content: 'ok' } }] }.to_json
    )

    expect(service.complete([{ role: 'user', content: 'a' * described_class::MAX_PROMPT_CHARS }])).to eq('ok')
  end

  describe 'health_status reflects recent provider failures' do
    let(:url) { 'https://agentgw.cloud/v1/chat/completions' }
    let(:ok_body) { { choices: [{ message: { content: 'ok' } }] }.to_json }

    it 'is available when configured and no call failed recently' do
      expect(service.health_status).to include(configured: true, available: true, last_failure_at: nil)
    end

    it 'turns unavailable for 5 minutes after a refused call (bad key) and recovers after a success' do
      stub_request(:post, url).to_return(status: 401)
      expect { service.complete([{ role: 'user', content: 'hi' }]) }.to raise_error(described_class::ProviderError)
      expect(service.health_status).to include(configured: true, available: false)
      expect(described_class.new(api_key: 'other').health_status[:available]).to be(false) # per installation, not per instance

      travel(Kchat::AiHealth::FAILURE_TTL + 1.second) do
        expect(service.health_status[:available]).to be(true)
      end

      Kchat::AiHealth.record_failure!
      stub_request(:post, url).to_return(status: 200, body: ok_body)
      service.complete([{ role: 'user', content: 'hi' }])
      expect(service.health_status[:available]).to be(true)
    end

    [401, 403, 500, 502, 503].each do |code|
      it "marks the provider unavailable on HTTP #{code} and exposes the status on the error" do
        stub_request(:post, url).to_return(status: code)
        expect { service.complete([{ role: 'user', content: 'hi' }]) }
          .to raise_error(described_class::ProviderError) { |e| expect(e.status).to eq(code) }
        expect(service.health_status[:available]).to be(false)
      end
    end

    [400, 413, 422, 429].each do |code|
      it "keeps the provider available on HTTP #{code} (a problem with this request, not the provider)" do
        stub_request(:post, url).to_return(status: code)
        expect { service.complete([{ role: 'user', content: 'hi' }]) }.to raise_error(described_class::ProviderError)
        expect(service.health_status[:available]).to be(true)
      end
    end

    it 'records network failures too' do
      stub_request(:post, url).to_raise(SocketError)
      expect { service.complete([{ role: 'user', content: 'hi' }]) }.to raise_error(described_class::ProviderError)
      expect(service.health_status[:available]).to be(false)
    end

    it 'is never available when not configured' do
      expect(described_class.new(api_key: '', provider: 'agentgw').health_status).to include(configured: false, available: false)
    end
  end
end
