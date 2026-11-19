# frozen_string_literal: true

# Brand profile, AI chat and content-idea jobs for one account.
# State lives in `account.custom_attributes['brand_growth']` (no shared files, safe across processes).
class BrandGrowth::EngineService
  class InvalidTransitionError < StandardError; end

  MAX_JOBS = 20
  MAX_CALENDAR_ITEMS = 100
  MAX_ANGLE_FIELD_CHARS = 1_000
  ANGLE_FIELDS = %w[angle hook body cta].freeze
  CALENDAR_CHANNELS = %w[facebook instagram tiktok zalo website].freeze
  CALENDAR_STATUSES = %w[draft scheduled published].freeze
  PROFILE_KEYS = %w[brand_name positioning usp persona tone hard_bans].freeze
  JOB_TRANSITIONS = { 'approve' => 'approved', 'reject' => 'rejected' }.freeze

  def initialize(account, llm_service: Ai::CustomLlmService.new)
    @account = account
    @llm = llm_service
  end

  def overview
    { brand_profile: profile, ai: @llm.health_status, jobs: state['jobs'] || [], calendar: calendar_items }
  end

  def calendar_items
    sort_calendar(Array(state['calendar']))
  end

  def profile
    state['profile'] || {}
  end

  def save_profile(attrs)
    update_state { |s| s['profile'] = profile.merge(attrs.to_h.stringify_keys.slice(*PROFILE_KEYS)) }['profile']
  end

  def chat_reply(message:, history: [])
    @llm.generate_brand_chat_reply(message: message, brand_profile: profile, history: history)
  end

  # Asks the model for 3 short-video angles around one topic; the job waits for human approval.
  def repurpose(topic:)
    raw = @llm.complete([
                          { role: 'system', content: @llm.build_system_prompt(profile) },
                          { role: 'user', content: repurpose_prompt(topic) }
                        ], model: Ai::CustomLlmService::DEFAULT_REASONING_MODEL)
    job = { 'id' => SecureRandom.uuid, 'topic' => topic, 'angles' => parse_angles(raw), 'status' => 'pending',
            'created_at' => Time.current.iso8601 }
    update_state { |s| s['jobs'] = ([job] + Array(s['jobs'])).first(MAX_JOBS) }
    job
  end

  def transition_job(job_id:, action:, angle_index: nil)
    new_status = JOB_TRANSITIONS.fetch(action.to_s) { raise InvalidTransitionError, "Unknown action #{action}" }
    job = nil
    update_state do |s|
      job = Array(s['jobs']).find { |j| j['id'] == job_id }
      raise ActiveRecord::RecordNotFound, "Job #{job_id} not found" if job.nil?

      apply_transition(job, new_status, angle_index)
    end
    job
  end

  def update_angle(job_id:, angle_index:, attrs:)
    idx = Integer(angle_index.to_s, 10, exception: false)
    clean_attrs = sanitize_angle_attrs(attrs)
    job = nil
    update_state do |s|
      job = Array(s['jobs']).find { |j| j['id'] == job_id }
      raise ActiveRecord::RecordNotFound, "Job #{job_id} not found" if job.nil?

      angles = Array(job['angles'])
      raise InvalidTransitionError, 'Invalid angle index' if idx.nil? || idx.negative? || idx >= angles.length

      angles[idx].merge!(clean_attrs)
    end
    job
  end

  def save_calendar_item(attrs)
    item = build_calendar_item(attrs)
    saved = nil
    update_state do |s|
      list = Array(s['calendar']).map(&:deep_dup)
      saved = upsert_calendar_entry(list, item)
      s['calendar'] = sort_calendar(list).first(MAX_CALENDAR_ITEMS)
    end
    saved
  end

  def delete_calendar_item(item_id)
    id = item_id.to_s
    raise ActiveRecord::RecordNotFound, 'Calendar item not found' if id.blank?

    update_state do |s|
      list = Array(s['calendar'])
      raise ActiveRecord::RecordNotFound, "Calendar item #{id} not found" if list.none? { |entry| entry['id'] == id }

      s['calendar'] = list.reject { |entry| entry['id'] == id }
    end
    { deleted: id }
  end

  private

  def upsert_calendar_entry(list, item)
    existing_idx = item['id'].present? ? list.index { |entry| entry['id'] == item['id'] } : nil
    return create_calendar_entry(list, item) if existing_idx.nil?

    list[existing_idx] = list[existing_idx].merge(item.compact).merge('updated_at' => Time.current.iso8601)
  end

  def create_calendar_entry(list, item)
    created = item.merge('id' => SecureRandom.uuid, 'created_at' => Time.current.iso8601)
    list.unshift(created)
    created
  end

  def sanitize_angle_attrs(attrs)
    attrs.to_h.stringify_keys.slice(*ANGLE_FIELDS).transform_values { |value| sanitize_text(value) }
  end

  def build_calendar_item(attrs)
    raw = attrs.to_h.stringify_keys
    meta = extract_calendar_meta(raw)
    meta.merge(
      'id' => raw['id'].presence,
      'campaign_tag' => raw.key?('campaign_tag') ? raw['campaign_tag'].to_s.strip.first(60) : nil,
      'hook' => sanitize_text(raw['hook']),
      'body' => sanitize_text(raw['body']),
      'cta' => sanitize_text(raw['cta']),
      'source_job_id' => raw['source_job_id'].presence
    )
  end

  def extract_calendar_meta(raw)
    title = raw['title'].to_s.strip.first(200)
    raise InvalidTransitionError, 'Vui lòng nhập tiêu đề nội dung' if title.empty?

    channel = raw['channel'].to_s.downcase
    raise InvalidTransitionError, 'Kênh đăng không hợp lệ' unless CALENDAR_CHANNELS.include?(channel)

    status = raw['status'].presence.to_s.downcase
    status = 'scheduled' if status.blank?
    raise InvalidTransitionError, 'Trạng thái lịch đăng không hợp lệ' unless CALENDAR_STATUSES.include?(status)

    scheduled_for = raw['scheduled_for'].to_s.strip
    raise InvalidTransitionError, 'Ngày dự kiến đăng không hợp lệ (YYYY-MM-DD)' unless scheduled_for.match?(/\A\d{4}-\d{2}-\d{2}\z/)

    { 'title' => title, 'channel' => channel, 'status' => status, 'scheduled_for' => scheduled_for }
  end

  def sanitize_text(value)
    return nil if value.nil?

    @llm.enforce_brand_guardrails(value.to_s.strip.first(MAX_ANGLE_FIELD_CHARS), profile['hard_bans'])[:sanitized_text]
  end

  def sort_calendar(items)
    items.sort_by { |item| [item['scheduled_for'].to_s, -Time.zone.parse(item['created_at'].to_s)&.to_i.to_i] }
  end

  def apply_transition(job, new_status, angle_index)
    if angle_index.nil?
      raise InvalidTransitionError, "Job is already #{job['status']}" unless job['status'] == 'pending'

      job['status'] = new_status
      return
    end

    idx = Integer(angle_index.to_s, 10, exception: false)
    angles = Array(job['angles'])
    raise InvalidTransitionError, 'Invalid angle index' if idx.nil? || idx.negative? || idx >= angles.length

    angles[idx]['status'] = new_status
    job['status'] = aggregate_job_status(angles.pluck('status'))
  end

  def aggregate_job_status(statuses)
    return 'approved' if statuses.any?('approved')
    return 'rejected' if statuses.all?('rejected')

    'pending'
  end

  def state
    @account.custom_attributes.to_h.fetch('brand_growth', {})
  end

  def update_state
    @account.with_lock do
      attrs = @account.custom_attributes.to_h.deep_dup
      brand_state = attrs['brand_growth'] ||= {}
      yield brand_state
      @account.update!(custom_attributes: attrs)
      brand_state
    end
  end

  def parse_angles(raw)
    Array(Ai::CustomLlmService.extract_json(raw)['angles']).first(3).map do |angle|
      angle.to_h.slice('angle', 'hook', 'body', 'cta').transform_values do |text|
        @llm.enforce_brand_guardrails(text, profile['hard_bans'])[:sanitized_text]
      end
    end
  end

  def repurpose_prompt(topic)
    <<~PROMPT
      Chủ đề: #{topic}
      Đề xuất 3 góc kể chuyện khác nhau cho video ngắn 9:16 (TikTok/Reels).
      Chỉ trả về JSON dạng {"angles":[{"angle":"","hook":"câu mở đầu 3 giây","body":"nội dung chính","cta":"lời kêu gọi"}]}.
    PROMPT
  end
end
