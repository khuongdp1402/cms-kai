# frozen_string_literal: true

# Publishes one approved Kchat::Post to its Facebook Page through the Graph API (ADR-031).
# Returns { external_post_id:, permalink: }. Raises Kchat::Publishing::Error when Facebook refuses or
# when the request may have reached Facebook without an answer (`publish_unknown`, never retried).
class Kchat::Publishing::FacebookPublisher
  GRAPH_URL = 'https://graph.facebook.com/v22.0'
  GRAPH_VIDEO_URL = 'https://graph-video.facebook.com/v22.0'
  RUPLOAD_URL = 'https://rupload.facebook.com/video-upload/v22.0'
  TIMEOUT = 60
  VIDEO_TIMEOUT = 600

  # The connection never opened: Facebook cannot have created anything, so a retry is safe.
  NOT_SENT_ERRORS = [Net::OpenTimeout, SocketError, Errno::ECONNREFUSED, Errno::EHOSTUNREACH, Errno::ENETUNREACH].freeze
  # The request may have been processed: retrying could publish the post twice.
  UNKNOWN_OUTCOME_ERRORS = [Net::ReadTimeout, Net::WriteTimeout, Errno::ECONNRESET, EOFError, OpenSSL::SSL::SSLError].freeze

  def initialize(post)
    @post = post
    @channel = post.inbox&.channel
    raise Kchat::Publishing::Error, 'inbox_not_facebook_page' unless @channel.is_a?(Channel::FacebookPage)
  end

  def publish!
    object_id = case @post.post_format
                when 'text' then publish_text
                when 'photo' then publish_photo
                when 'album' then publish_album
                when 'video' then publish_video
                when 'reel' then publish_reel
                else raise Kchat::Publishing::Error, 'unsupported_format'
                end
    { external_post_id: object_id, permalink: permalink_for(object_id) }
  end

  private

  def page_id
    @channel.page_id
  end

  def publish_text
    graph_post("#{GRAPH_URL}/#{page_id}/feed", { message: @post.caption.presence, link: @post.link_url.presence }.compact)['id']
  end

  def publish_photo
    with_file(@post.ordered_media.first) do |file|
      result = graph_post("#{GRAPH_URL}/#{page_id}/photos", { source: file, caption: @post.caption.to_s })
      result['post_id'].presence || result['id']
    end
  end

  # Photos are uploaded unpublished, then attached to one feed post.
  def publish_album
    media_ids = @post.ordered_media.map do |attachment|
      with_file(attachment) { |file| graph_post("#{GRAPH_URL}/#{page_id}/photos", { source: file, published: 'false' })['id'] }
    end
    body = { message: @post.caption.to_s }
    media_ids.each_with_index { |media_id, index| body["attached_media[#{index}]"] = { media_fbid: media_id }.to_json }
    graph_post("#{GRAPH_URL}/#{page_id}/feed", body)['id']
  end

  def publish_video
    with_file(@post.ordered_media.first) do |file|
      graph_post("#{GRAPH_VIDEO_URL}/#{page_id}/videos", { source: file, description: @post.caption.to_s }, timeout: VIDEO_TIMEOUT)['id']
    end
  end

  # Reels: start -> upload the bytes to rupload -> finish with video_state PUBLISHED (same 3 phases as the
  # Omni-Viral Studio client). Nothing is public before `finish`, so start/upload failures cannot double-post.
  def publish_reel
    reels_url = "#{GRAPH_URL}/#{page_id}/video_reels"
    start = graph_post(reels_url, { upload_phase: 'start' }, require_key: 'video_id')
    video_id = start['video_id']
    with_file(@post.ordered_media.first) do |file|
      bytes = file.read
      upload_url = start['upload_url'].presence || "#{RUPLOAD_URL}/#{video_id}"
      request(:post, upload_url, require_key: 'success', timeout: VIDEO_TIMEOUT, body: bytes,
                                 headers: { 'Authorization' => "OAuth #{@channel.page_access_token}", 'offset' => '0',
                                            'file_size' => bytes.bytesize.to_s })
    end
    finish = { upload_phase: 'finish', video_id: video_id, video_state: 'PUBLISHED', description: @post.caption.to_s }
    # Meta AI disclosure on Reels; taken from the studio client, check it on the first real post.
    finish[:is_ai_generated] = 'true' if @post.ai_generated
    graph_post(reels_url, finish, require_key: 'success')
    video_id
  end

  def with_file(attachment, &)
    attachment.blob.open(&)
  end

  # The token goes in the body, not the URL, so it does not end up in proxy or request logs.
  def graph_post(url, body, timeout: TIMEOUT, require_key: 'id')
    request(:post, url, require_key: require_key, timeout: timeout, body: body.merge(access_token: @channel.page_access_token))
  end

  def request(method, url, require_key:, timeout:, **options)
    response = HTTParty.public_send(method, url, timeout: timeout, **options)
    parsed = response.parsed_response
    return parsed if response.success? && parsed.is_a?(Hash) && parsed[require_key].present?

    raise Kchat::Publishing::Error.from_response(response)
  rescue *NOT_SENT_ERRORS => e
    raise Kchat::Publishing::Error.new('network_error', e.message, retryable: true)
  rescue *UNKNOWN_OUTCOME_ERRORS => e
    raise Kchat::Publishing::Error.new('publish_unknown', e.message)
  end

  # The post already exists at this point: a failed permalink lookup must not fail the publish
  # (a retry would post it a second time), so it is logged and left empty.
  def permalink_for(object_id)
    response = HTTParty.get("#{GRAPH_URL}/#{object_id}",
                            query: { fields: 'permalink_url', access_token: @channel.page_access_token }, timeout: TIMEOUT)
    url = response.success? && response.parsed_response.is_a?(Hash) ? response.parsed_response['permalink_url'].to_s : ''
    Rails.logger.warn("[Kchat::Publishing] post=#{@post.id} permalink lookup failed: HTTP #{response.code}") if url.blank?
    url.start_with?('/') ? "https://www.facebook.com#{url}" : url.presence
  rescue *(NOT_SENT_ERRORS + UNKNOWN_OUTCOME_ERRORS) => e
    Rails.logger.warn("[Kchat::Publishing] post=#{@post.id} permalink lookup failed: #{e.class}")
    nil
  end
end
