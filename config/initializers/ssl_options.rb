# With FORCE_SSL=true ActionDispatch::SSL answers plain-HTTP requests with a 301. The container healthcheck calls
# http://127.0.0.1:3000/health directly (not through nginx), so /health must be exempt from the redirect.
# HSTS and secure cookies stay on; only the redirect is skipped for this one path.
Rails.application.config.ssl_options = {
  redirect: { exclude: ->(request) { request.path == '/health' } }
}
