require 'rails_helper'

describe 'Kalo dashboard global config', type: :request do
  def global_config
    JSON.parse(response.body[/window\.globalConfig = (.*)$/, 1])
  end

  it 'reports Captain tasks as not ready without an OpenAI key' do
    InstallationConfig.where(name: 'CAPTAIN_OPEN_AI_API_KEY').delete_all

    get '/app/login'

    expect(global_config['KALO_CAPTAIN_TASKS_READY']).to be(false)
  end

  it 'reports Captain tasks as ready when the OpenAI key is configured' do
    InstallationConfig.where(name: 'CAPTAIN_OPEN_AI_API_KEY').delete_all
    InstallationConfig.create!(name: 'CAPTAIN_OPEN_AI_API_KEY', value: 'sk-test')

    get '/app/login'

    expect(global_config['KALO_CAPTAIN_TASKS_READY']).to be(true)
  end
end
