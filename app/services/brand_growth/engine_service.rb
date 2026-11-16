# frozen_string_literal: true

# Brand profile, AI chat and content-idea jobs for one account.
# State lives in `account.custom_attributes['brand_growth']` (no shared files, safe across processes).
class BrandGrowth::EngineService
  class InvalidTransitionError < StandardError; end

  MAX_JOBS = 20
  PROFILE_KEYS = %w[brand_name positioning usp persona tone hard_bans].freeze
  JOB_TRANSITIONS = { 'approve' => 'approved', 'reject' => 'rejected' }.freeze

  def initialize(account, llm_service: Ai::CustomLlmService.new)
    @account = account
    @llm = llm_service
  end

  def overview
    { brand_profile: profile, ai: @llm.health_status, jobs: state['jobs'] || [] }
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

  def transition_job(job_id:, action:)
    new_status = JOB_TRANSITIONS.fetch(action.to_s) { raise InvalidTransitionError, "Unknown action #{action}" }
    job = nil
    update_state do |s|
      job = Array(s['jobs']).find { |j| j['id'] == job_id }
      raise ActiveRecord::RecordNotFound, "Job #{job_id} not found" if job.nil?
      raise InvalidTransitionError, "Job is already #{job['status']}" unless job['status'] == 'pending'

      job['status'] = new_status
    end
    job
  end

  private

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
