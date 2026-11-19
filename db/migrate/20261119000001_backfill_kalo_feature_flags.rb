# Kalo feature groups (ADR-023): accounts created before the flags existed get the core modules on
# and keep every advanced group they already use. New accounts get defaults from config/features.yml.
class BackfillKaloFeatureFlags < ActiveRecord::Migration[7.1]
  def up
    Account.reset_column_information
    Account.find_each { |account| Kchat::Features.backfill!(account) }
  end

  def down
    # Flags are additive and harmless to keep.
  end
end
