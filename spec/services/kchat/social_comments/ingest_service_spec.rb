# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::SocialComments::IngestService do
  let(:account) { create(:account) }

  before do
    stub_request(:post, /graph\.facebook\.com/).to_return(status: 200, body: { success: true, id: 'c_reply_1' }.to_json,
                                                          headers: { 'Content-Type' => 'application/json' })
    stub_request(:post, /graph\.instagram\.com/).to_return(status: 200, body: { success: true, id: 'ig_reply_1' }.to_json,
                                                           headers: { 'Content-Type' => 'application/json' })
  end

  describe '.from_facebook_entry' do
    let!(:fb_channel) { create(:channel_facebook_page, account: account, page_id: 'page_100', page_access_token: 'page_tok') }
    let!(:fb_inbox) do
      fb_channel.inbox.tap { |inbox| inbox.update!(account: account) }
    end

    def fb_entry(text:, comment_id: 'cmt_1', author_id: 'user_99')
      {
        id: fb_channel.page_id,
        changes: [
          {
            field: 'feed',
            value: {
              item: 'comment',
              verb: 'add',
              comment_id: comment_id,
              post_id: 'post_777',
              message: text,
              permalink_url: 'https://facebook.com/post_777',
              from: { id: author_id, name: 'Lan Anh' }
            }
          }
        ]
      }
    end

    it 'ingests comment, auto-hides phone number, labels conversation, and sends private reply when enabled' do
      Kchat::SocialComments::RulesService.new(account).update(
        enabled: true,
        auto_hide_phone: true,
        hide_keywords: 'sỉ, CTV',
        auto_private_reply: true,
        private_reply_template: 'Chào {{name}}, shop {{shop_name}} đã nhắn bạn!'
      )

      described_class.from_facebook_entry(fb_entry(text: 'Tư vấn giúp em 0901.234.567 ạ'))

      conv = fb_inbox.conversations.last
      expect(conv).to be_present
      expect(conv.label_list).to include('binh-luan')
      expect(conv.additional_attributes).to include(
        'source_type' => 'social_comment',
        'platform' => 'facebook',
        'comment_id' => 'cmt_1',
        'post_id' => 'post_777',
        'private_reply_sent' => true
      )
      incoming = conv.messages.incoming.first
      expect(incoming.content).to eq('Tư vấn giúp em 0901.234.567 ạ')
      expect(incoming.content_attributes['comment_hidden']).to be(true)
      expect(a_request(:post, 'https://graph.facebook.com/v22.0/cmt_1?access_token=page_tok')).to have_been_made.once
      expect(a_request(:post, 'https://graph.facebook.com/v22.0/page_100/messages?access_token=page_tok')).to have_been_made.once
    end

    it 'skips self-comments and deduplicates repeated webhook deliveries' do
      described_class.from_facebook_entry(fb_entry(text: 'Shop rep', author_id: fb_channel.page_id, comment_id: 'self_1'))
      expect(fb_inbox.conversations.count).to eq(0)

      described_class.from_facebook_entry(fb_entry(text: 'Giá sao shop?', comment_id: 'dup_1'))
      described_class.from_facebook_entry(fb_entry(text: 'Giá sao shop?', comment_id: 'dup_1'))
      expect(fb_inbox.conversations.count).to eq(1)
      expect(fb_inbox.messages.incoming.count).to eq(1)
    end

    it 'routes agent reply back to Graph API comment endpoint' do
      described_class.from_facebook_entry(fb_entry(text: 'Ship nội thành không shop?', comment_id: 'cmt_rep'))
      conv = fb_inbox.conversations.last
      agent_msg = create(:message, account: account, inbox: fb_inbox, conversation: conv, message_type: :outgoing,
                                   content: 'Dạ freeship nội thành nhé!')

      Facebook::SendOnFacebookService.new(message: agent_msg).perform

      expect(a_request(:post, 'https://graph.facebook.com/v22.0/cmt_rep/comments?access_token=page_tok')).to have_been_made.once
      expect(agent_msg.reload.source_id).to eq('c_reply_1')
    end
  end

  describe '.from_instagram_entry' do
    let!(:ig_channel) { create(:channel_instagram, account: account, instagram_id: 'ig_200', access_token: 'ig_tok') }
    let!(:ig_inbox) { ig_channel.inbox }

    it 'ingests Instagram comment via changes webhook and routes replies to IG replies endpoint' do
      entry = {
        id: 'ig_200',
        changes: [
          {
            field: 'comments',
            value: {
              id: 'ig_cmt_1',
              text: 'Inbox giá sỉ 0987654321',
              from: { id: 'ig_usr_1', username: 'minh_anh' },
              media: { id: 'media_55' }
            }
          }
        ]
      }

      Webhooks::InstagramEventsJob.perform_now([entry])

      conv = ig_inbox.conversations.last
      expect(conv.additional_attributes['source_type']).to eq('social_comment')
      expect(conv.additional_attributes['platform']).to eq('instagram')
      expect(a_request(:post, 'https://graph.instagram.com/v22.0/ig_cmt_1?access_token=ig_tok')).to have_been_made.once

      reply = create(:message, account: account, inbox: ig_inbox, conversation: conv, message_type: :outgoing,
                               content: 'Shop vừa nhắn qua DM cho bạn ạ')
      Instagram::SendOnInstagramService.new(message: reply).perform
      expect(a_request(:post, 'https://graph.instagram.com/v22.0/ig_cmt_1/replies?access_token=ig_tok')).to have_been_made.once
      expect(reply.reload.source_id).to eq('ig_reply_1')
    end
  end
end
