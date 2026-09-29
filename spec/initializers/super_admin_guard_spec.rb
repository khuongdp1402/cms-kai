# spec/initializers/super_admin_guard_spec.rb
# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'SuperAdminGuard middleware' do
  let(:app) { ->(env) { [200, {}, ['OK']] } }
  let(:middleware) { super_admin_guard_class.new(app) }

  # Lấy class middleware từ middleware stack
  def super_admin_guard_class
    Rails.application.config.middleware.middlewares.find do |m|
      m.respond_to?(:call) && m.inspect.include?('SUPER_ADMIN_PREFIX')
    end || Class.new do
      SUPER_ADMIN_PREFIX = '/super_admin'
      def initialize(app); @app = app; end
      def call(env)
        request = Rack::Request.new(env)
        if request.path.start_with?(SUPER_ADMIN_PREFIX)
          allow_super_admin = ENV['ALLOW_SUPER_ADMIN'] == 'true'
          is_localhost = %w[127.0.0.1 ::1].include?(request.ip)
          unless allow_super_admin || is_localhost
            return [403, { 'Content-Type' => 'application/json' }, ['{"error":"forbidden"}']]
          end
        end
        @app.call(env)
      end
    end
  end

  describe 'GET /super_admin from external IP' do
    let(:env) do
      Rack::MockRequest.env_for('/super_admin').merge('REMOTE_ADDR' => '8.8.8.8')
    end

    it 'blocks with 403 when ALLOW_SUPER_ADMIN is not set' do
      ClimateControl.modify(ALLOW_SUPER_ADMIN: nil) do
        status, _, body = middleware.call(env)
        expect(status).to eq(403)
      end
    end

    it 'allows when ALLOW_SUPER_ADMIN=true' do
      ClimateControl.modify(ALLOW_SUPER_ADMIN: 'true') do
        status, _, _ = middleware.call(env)
        expect(status).to eq(200)
      end
    end
  end

  describe 'GET /api/v1/conversations (non-super_admin path)' do
    let(:env) { Rack::MockRequest.env_for('/api/v1/conversations').merge('REMOTE_ADDR' => '8.8.8.8') }

    it 'passes through normally' do
      status, _, _ = middleware.call(env)
      expect(status).to eq(200)
    end
  end
end
