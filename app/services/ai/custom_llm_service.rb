# frozen_string_literal: true

module Ai
  class CustomLlmService
    attr_reader :api_key, :endpoint, :model

    def initialize(api_key: nil, endpoint: nil, model: nil)
      @api_key = api_key || ENV.fetch('CUSTOM_AI_API_KEY', '')
      @endpoint = endpoint || ENV.fetch('CUSTOM_AI_ENDPOINT', 'https://api.openai.com/v1/chat/completions')
      @model = model || ENV.fetch('CUSTOM_AI_MODEL', 'gpt-4o-mini')
    end

    def generate_reply_suggestion(conversation_messages)
      messages = [
        { role: 'system',
          content: 'You are a helpful customer service assistant. Provide a polite and concise response suggestion for the support agent.' }
      ]

      conversation_messages.each do |msg|
        role = msg.incoming? ? 'user' : 'assistant'
        messages << { role: role, content: msg.content }
      end

      call_llm_api(messages)
    end

    def summarize_conversation(conversation_messages)
      transcript = conversation_messages.map { |m| "#{m.sender_name || m.message_type}: #{m.content}" }.join("\n")
      messages = [
        { role: 'system', content: 'Summarize the following customer support conversation concisely in 3 bullet points.' },
        { role: 'user', content: transcript }
      ]

      call_llm_api(messages)
    end

    private

    def call_llm_api(messages)
      response = HTTParty.post(
        endpoint,
        headers: {
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{api_key}"
        },
        body: {
          model: model,
          messages: messages,
          temperature: 0.7
        }.to_json
      )

      return nil unless response.success?

      json = JSON.parse(response.body)
      json.dig('choices', 0, 'message', 'content')
    rescue StandardError => e
      Rails.logger.error("CustomLlmService Error: #{e.message}")
      nil
    end
  end
end
