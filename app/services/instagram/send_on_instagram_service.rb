class Instagram::SendOnInstagramService < Instagram::BaseSendService
  private

  def channel_class
    Channel::Instagram
  end

  def send_content
    if comment_reply_id.present?
      reply_to_comment(
        url: "https://graph.instagram.com/v22.0/#{comment_reply_id}/replies",
        query: { access_token: channel.access_token }
      )
      return
    end

    send_message(message_params)
  end

  # Deliver a message with the given payload.
  # https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
  def send_message(message_content)
    access_token = channel.access_token
    query = { access_token: access_token }
    instagram_id = channel.instagram_id.presence || 'me'

    response = HTTParty.post(
      "https://graph.instagram.com/v22.0/#{instagram_id}/messages",
      body: message_content,
      query: query
    )

    process_response(response, message_content)
  end

  def merge_human_agent_tag(params)
    global_config = GlobalConfig.get('ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT')

    return params unless global_config['ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT']

    params[:messaging_type] = 'MESSAGE_TAG'
    params[:tag] = 'HUMAN_AGENT'
    params
  end
end
