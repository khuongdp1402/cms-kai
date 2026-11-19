# Adds Kalo capability flags to window.globalConfig of the dashboard.
#
# KALO_CAPTAIN_TASKS_READY: the composer AI menu (Captain tasks: rewrite,
# summarize, reply suggestion) only works when an OpenAI key is configured in
# InstallationConfig (Captain::BaseTaskService#system_api_key); the account
# feature flag alone is not enough, without the key every call returns 422.
module Kchat::DashboardConfig
  private

  def app_config
    super.merge(KALO_CAPTAIN_TASKS_READY: InstallationConfig.find_by(name: 'CAPTAIN_OPEN_AI_API_KEY')&.value.present?)
  end
end
