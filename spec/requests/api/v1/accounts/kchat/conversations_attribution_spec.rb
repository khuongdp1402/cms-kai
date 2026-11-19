# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Kchat conversation attribution API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:conversation) do
    inbox = create(:inbox, account: account)
    contact = create(:contact, account: account)
    create(:conversation,
           account: account,
           inbox: inbox,
           contact: contact,
           contact_inbox: create(:contact_inbox, contact: contact, inbox: inbox),
           additional_attributes: { 'referer' => 'https://kalo.vn?utm_source=tiktok&utm_campaign=flash_sale' })
  end

  it 'auto-extracts UTM params from referer on creation and allows manual update with label sync' do
    expect(conversation.additional_attributes).to include(
      'utm_source' => 'tiktok',
      'utm_campaign' => 'flash_sale'
    )

    patch "/api/v1/accounts/#{account.id}/kchat/conversations/#{conversation.display_id}/attribution",
          params: { utm_source: 'facebook_ads', utm_campaign: 'Tet 2027', sync_label: true },
          headers: agent.create_new_auth_token,
          as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include('utm_source' => 'facebook_ads', 'utm_campaign' => 'Tet 2027')
    expect(conversation.reload.label_list).to include('tet_2027')
  end
end
