# Be sure to restart your server when you modify this file.

# Configure sensitive parameters which will be filtered from the log file.
Rails.application.config.filter_parameters += [
  :password, :secret, :_key, :auth, :crypt, :salt, :certificate, :otp, :access, :private, :protected, :ssn,
  :otp_secret, :otp_code, :backup_code, :mfa_token, :otp_backup_codes,
  :signing_secret, :qr_data_url, :zalo_cookie, :zalo_imei
]

# Regex to filter all occurrences of 'token' in keys except for 'website_token'
filter_regex = /\A(?!.*\bwebsite_token\b).*token/i

# Apply the regex for filtering
Rails.application.config.filter_parameters += [filter_regex]

# The Kalo assistant receives free-text chat from shop owners (may include customer data): keep it out of the logs.
# Scoped by controller so `message`/`content` of other endpoints keep logging as before.
kalo_assistant_controller = 'api/v1/accounts/kchat/assistant'
Rails.application.config.filter_parameters << lambda { |key, value, original_params|
  filtered = %w[message content].include?(key.to_s) && original_params['controller'] == kalo_assistant_controller
  value.replace('[FILTERED]') if filtered && value.is_a?(String)
}
