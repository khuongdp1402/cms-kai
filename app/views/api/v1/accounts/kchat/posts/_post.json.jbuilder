json.id post.id
json.status post.status
json.post_format post.post_format
json.caption post.caption
json.link_url post.link_url
json.pillar post.pillar
json.media_brief post.media_brief
json.review_note post.review_note
json.scheduled_at post.scheduled_at&.iso8601
json.approved_at post.approved_at&.iso8601
json.published_at post.published_at&.iso8601
json.external_post_id post.external_post_id
json.permalink post.permalink
json.error_code post.error_code
json.error_message post.error_message
json.attempts post.attempts
json.metrics post.metrics
json.ai_generated post.ai_generated
json.source post.source
json.source_ref post.source_ref
json.media_request_status post.media_request_status
json.media_request_note post.media_request_note
json.media_requested_at post.media_requested_at&.iso8601
json.inbox_id post.inbox_id
json.inbox_name post.inbox&.name
json.content_plan_id post.content_plan_id
json.created_by_id post.created_by_id
json.approved_by_name post.approved_by&.name
json.media post.ordered_media do |attachment|
  json.id attachment.id
  json.url url_for(attachment)
  json.filename attachment.filename.to_s
  json.content_type attachment.content_type
  json.byte_size attachment.byte_size
end
json.blockers %w[draft pending_approval].include?(post.status) ? post.publish_blockers : []
