# frozen_string_literal: true

# A publish attempt that Facebook refused or that may not have reached it. `code` is what the dashboard shows;
# `retryable` is true only when the post certainly was not created, so a retry cannot publish it twice.
class Kchat::Publishing::Error < StandardError
  # Graph error codes that mean "try again later" (temporary service errors, rate limits).
  TRANSIENT_GRAPH_CODES = [1, 2, 4, 17, 32, 341, 613].freeze
  TOKEN_GRAPH_CODES = [102, 190].freeze

  attr_reader :code, :retryable

  def initialize(code, message = nil, retryable: false)
    @code = code
    @retryable = retryable
    super(message || code)
  end

  def self.from_response(response)
    parsed = response.parsed_response
    error = parsed.is_a?(Hash) ? parsed['error'] : nil
    graph_code = error.is_a?(Hash) ? error['code'].to_i : nil
    message = (error.is_a?(Hash) && error['message'].presence) || "HTTP #{response.code}"

    new(code_for(graph_code, response.code), message, retryable: retryable?(graph_code, response.code))
  end

  def self.code_for(graph_code, http_status)
    return 'token_invalid' if TOKEN_GRAPH_CODES.include?(graph_code)
    return 'permission_denied' if graph_code == 10 || (200..299).cover?(graph_code)
    return 'temporary_error' if TRANSIENT_GRAPH_CODES.include?(graph_code)
    return 'facebook_unavailable' if http_status.to_i >= 500

    'invalid_request'
  end

  def self.retryable?(graph_code, http_status)
    TRANSIENT_GRAPH_CODES.include?(graph_code) || (graph_code.nil? && http_status.to_i >= 500)
  end
end
