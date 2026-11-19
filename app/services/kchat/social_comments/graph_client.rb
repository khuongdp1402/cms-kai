# frozen_string_literal: true

class Kchat::SocialComments::GraphClient
  JSON_HEADERS = { 'Content-Type' => 'application/json' }.freeze

  def initialize(channel:, platform:)
    @channel = channel
    @platform = platform
  end

  def hide_comment(comment_id)
    if @platform == 'facebook'
      HTTParty.post("https://graph.facebook.com/v22.0/#{comment_id}", body: { is_hidden: true }, query: { access_token: @channel.page_access_token })
    elsif @channel.is_a?(Channel::Instagram)
      HTTParty.post("https://graph.instagram.com/v22.0/#{comment_id}", body: { hide: true }, query: { access_token: @channel.access_token })
    else
      HTTParty.post("https://graph.facebook.com/v22.0/#{comment_id}", body: { hide: true }, query: { access_token: @channel.page_access_token })
    end
  end

  def send_private_reply(comment_id, reply_text)
    payload = { recipient: { comment_id: comment_id }, message: { text: reply_text } }.to_json
    if @platform == 'instagram' && @channel.is_a?(Channel::Instagram)
      url = "https://graph.instagram.com/v22.0/#{@channel.instagram_id}/messages"
      token = @channel.access_token
    else
      url = "https://graph.facebook.com/v22.0/#{@channel.page_id}/messages"
      token = @channel.page_access_token
    end
    HTTParty.post(url, body: payload, headers: JSON_HEADERS, query: { access_token: token })
  end
end
