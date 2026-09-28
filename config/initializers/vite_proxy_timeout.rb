# frozen_string_literal: true

if Rails.env.development?
  require 'rack/proxy'

  module RackProxyTimeoutPatch
    def initialize(app = nil, options = {})
      options = options.dup
      options[:read_timeout] = 300
      options[:connect_timeout] = 300
      super(app, options)
      @read_timeout = 300
    end

    def perform_request(env)
      @read_timeout = 300
      super
    end
  end

  Rack::Proxy.prepend(RackProxyTimeoutPatch)
end

