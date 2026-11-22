# == Schema Information
#
# Table name: kchat_posts
#
#  id                    :bigint           not null, primary key
#  ai_generated          :boolean          default(FALSE), not null
#  approved_at           :datetime
#  attempts              :integer          default(0), not null
#  caption               :text
#  error_code            :string
#  error_message         :text
#  link_url              :string
#  media_brief           :text
#  media_request_note    :text
#  media_request_status  :string
#  media_requested_at    :datetime
#  metrics               :jsonb            not null
#  permalink             :string
#  pillar                :string
#  post_format           :string           default("text"), not null
#  published_at          :datetime
#  publishing_started_at :datetime
#  review_note           :text
#  scheduled_at          :datetime
#  source                :string           default("kalo"), not null
#  source_ref            :string
#  status                :string           default("draft"), not null
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#  account_id            :bigint           not null
#  approved_by_id        :bigint
#  content_plan_id       :bigint
#  created_by_id         :bigint
#  external_post_id      :string
#  inbox_id              :bigint
#
# Indexes
#
#  index_kchat_posts_on_account_id                           (account_id)
#  index_kchat_posts_on_account_id_and_media_request_status  (account_id,media_request_status)
#  index_kchat_posts_on_account_id_and_scheduled_at          (account_id,scheduled_at)
#  index_kchat_posts_on_account_id_and_source_and_source_ref (account_id,source,source_ref) UNIQUE WHERE (source_ref IS NOT NULL)
#  index_kchat_posts_on_account_id_and_status        (account_id,status)
#  index_kchat_posts_on_approved_by_id               (approved_by_id)
#  index_kchat_posts_on_content_plan_id              (content_plan_id)
#  index_kchat_posts_on_created_by_id                (created_by_id)
#  index_kchat_posts_on_inbox_id                     (inbox_id)
#  index_kchat_posts_on_status_and_scheduled_at      (status,scheduled_at)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#  fk_rails_...  (approved_by_id => users.id) ON DELETE => nullify
#  fk_rails_...  (content_plan_id => kchat_content_plans.id) ON DELETE => nullify
#  fk_rails_...  (created_by_id => users.id) ON DELETE => nullify
#  fk_rails_...  (inbox_id => inboxes.id) ON DELETE => nullify
#
# A Facebook Page post that an admin approves and Kalo publishes at `scheduled_at` (ADR-031).
# draft -> pending_approval -> approved -> publishing -> published | failed
# Every status change runs inside the row lock so a post is never published twice.
class Kchat::Post < ApplicationRecord
  class InvalidTransition < StandardError; end

  # Raised by submit/approve when the post cannot be published as it is; `blockers` are error codes.
  class NotPublishable < StandardError
    attr_reader :blockers

    def initialize(blockers)
      @blockers = blockers
      super(blockers.join(', '))
    end
  end

  STATUSES = %w[draft pending_approval approved publishing published failed].freeze
  # `reel`: vertical short video published as a Facebook Reel (3-90 s), the usual output of the media studio.
  FORMATS = %w[text photo album video reel].freeze
  SOURCES = %w[kalo studio].freeze
  # Media studio link (ADR-032): Kalo asks the studio for media described in `media_brief`.
  MEDIA_REQUEST_STATUSES = %w[requested in_production delivered failed].freeze
  OPEN_MEDIA_REQUESTS = %w[requested in_production].freeze
  # Editing a post in these states sends it back to draft (it must be approved again).
  EDITABLE_STATUSES = %w[draft pending_approval approved failed].freeze
  DELETABLE_STATUSES = %w[draft pending_approval approved failed].freeze
  # Facebook Page photos accept JPEG, PNG, GIF (also BMP/TIFF, not offered here).
  IMAGE_CONTENT_TYPES = %w[image/jpeg image/png image/gif].freeze
  VIDEO_CONTENT_TYPES = %w[video/mp4 video/quicktime].freeze
  IMAGE_MAX_SIZE = 10.megabytes
  # Graph API takes up to 1 GB in one non-resumable upload; keep uploads through Rails well below that.
  VIDEO_MAX_SIZE = 500.megabytes
  ALBUM_IMAGES = (2..10)
  CAPTION_MAX = 63_206
  MAX_PUBLISH_ATTEMPTS = 3
  # A post approved for a time further back than this is rejected instead of being published late.
  PAST_SCHEDULE_GRACE = 5.minutes
  # A worker that died mid-publish leaves the post in `publishing`; after this it is failed as unknown.
  STALL_AFTER = 15.minutes

  belongs_to :account
  belongs_to :inbox, optional: true
  belongs_to :content_plan, class_name: 'Kchat::ContentPlan', optional: true
  belongs_to :created_by, class_name: 'User', optional: true
  belongs_to :approved_by, class_name: 'User', optional: true
  has_many_attached :media

  validates :status, inclusion: { in: STATUSES }
  validates :post_format, inclusion: { in: FORMATS }
  validates :caption, length: { maximum: CAPTION_MAX }
  validates :link_url, length: { maximum: 2_000 }, format: URI::DEFAULT_PARSER.make_regexp(%w[http https]), allow_blank: true
  validates :pillar, length: { maximum: 80 }
  validates :media_brief, length: { maximum: 5_000 }
  validates :review_note, length: { maximum: 1_000 }
  validates :source, inclusion: { in: SOURCES }
  validates :source_ref, length: { maximum: 120 }, uniqueness: { scope: [:account_id, :source], allow_nil: true }
  validates :media_request_status, inclusion: { in: MEDIA_REQUEST_STATUSES }, allow_nil: true
  validates :media_request_note, length: { maximum: 1_000 }
  validate :inbox_is_own_facebook_page, if: -> { inbox_id.present? && will_save_change_to_inbox_id? }
  validate :content_plan_is_own, if: -> { content_plan_id.present? && will_save_change_to_content_plan_id? }
  validate :acceptable_media, if: -> { attachment_changes['media'].present? }

  scope :due, -> { where(status: 'approved').where(scheduled_at: ..Time.current) }
  scope :open_media_requests, -> { where(media_request_status: OPEN_MEDIA_REQUESTS) }
  scope :stalled, -> { where(status: 'publishing').where(publishing_started_at: ...STALL_AFTER.ago) }

  # Error codes that stop this post from being submitted or approved; empty when it can be published.
  def publish_blockers
    blockers = []
    blockers << 'inbox_required' if inbox.nil?
    blockers << 'schedule_required' if scheduled_at.nil?
    blockers.concat(format_blockers)
    blockers << 'banned_phrases' if banned_phrases.any?
    blockers
  end

  def banned_phrases
    return [] if caption.blank?

    hard_bans = account.custom_attributes.to_h.dig('brand_growth', 'profile', 'hard_bans')
    Ai::CustomLlmService.new.enforce_brand_guardrails(caption, hard_bans)[:blocked_phrases]
  end

  def submit!
    transition!(from: %w[draft]) do
      ensure_publishable!
      { status: 'pending_approval', review_note: nil }
    end
  end

  # Returns true; the caller enqueues the publish job after the transaction commits.
  def approve!(user)
    transition!(from: %w[pending_approval]) do
      ensure_publishable!
      raise NotPublishable, ['schedule_in_past'] if scheduled_at < PAST_SCHEDULE_GRACE.ago

      { status: 'approved', approved_by: user, approved_at: Time.current, error_code: nil, error_message: nil }
    end
  end

  def reject!(note)
    transition!(from: %w[pending_approval]) { { status: 'draft', review_note: note.to_s.strip.presence } }
  end

  def unapprove!
    transition!(from: %w[approved]) { { status: 'draft', approved_by: nil, approved_at: nil } }
  end

  # Failed post back to the queue, published as soon as the job runs. A `publish_unknown` failure may
  # already be on the Page: the dashboard asks the admin to check the Page before retrying.
  def retry!(user)
    transition!(from: %w[failed]) do
      ensure_publishable!
      { status: 'approved', approved_by: user, approved_at: Time.current, scheduled_at: Time.current, attempts: 0,
        error_code: nil, error_message: nil }
    end
  end

  # Moves an approved, due post to `publishing` exactly once. False when there is nothing to publish.
  def claim_for_publishing!
    claimed = false
    with_lock do
      next unless status == 'approved' && scheduled_at.present? && scheduled_at <= Time.current && external_post_id.blank?

      update!(status: 'publishing', publishing_started_at: Time.current, attempts: attempts + 1)
      claimed = true
    end
    claimed
  end

  def mark_published!(external_post_id:, permalink:)
    update!(status: 'published', published_at: Time.current, external_post_id: external_post_id, permalink: permalink,
            error_code: nil, error_message: nil)
  end

  def mark_failed!(code, message = nil)
    update!(status: 'failed', error_code: code, error_message: message.to_s.first(1_000).presence)
  end

  # Transient Graph error: back to approved for a later run, keeping the last error for the dashboard.
  def schedule_retry!(at, code, message)
    update!(status: 'approved', scheduled_at: at, error_code: code, error_message: message.to_s.first(1_000).presence)
  end

  def mark_stalled!
    with_lock do
      next unless status == 'publishing' && publishing_started_at.present? && publishing_started_at < STALL_AFTER.ago

      mark_failed!('publish_unknown', 'Publishing did not finish; check the Page before retrying.')
    end
  end

  # ---- media studio link (ADR-032) ----

  # Kalo asks the studio to produce the media described in `media_brief`. The post goes back to draft.
  def request_media!(note = nil)
    transition!(from: EDITABLE_STATUSES) do
      raise NotPublishable, ['media_brief_required'] if media_brief.blank?
      raise InvalidTransition, 'invalid_transition' if OPEN_MEDIA_REQUESTS.include?(media_request_status)

      { status: 'draft', approved_by: nil, approved_at: nil, media_request_status: 'requested',
        media_request_note: note.to_s.strip.presence, media_requested_at: Time.current }
    end
  end

  # The studio takes a request so a second studio run does not produce it again.
  def claim_media_request!
    with_lock do
      raise InvalidTransition, 'invalid_transition' unless media_request_status == 'requested'

      update!(media_request_status: 'in_production')
    end
    true
  end

  # Replaces the post media with what the studio produced. The post stays (or goes back to) draft:
  # a person still reviews and approves it before anything is published.
  def deliver_media!(files:, post_format:, caption: nil, ai_generated: false)
    with_lock do
      raise InvalidTransition, 'invalid_transition' unless OPEN_MEDIA_REQUESTS.include?(media_request_status)
      raise InvalidTransition, 'invalid_transition' unless EDITABLE_STATUSES.include?(status)

      # Assigning replaces the attachments; old blobs are purged only after the transaction commits.
      attrs = { media: files, status: 'draft', approved_by: nil, approved_at: nil, post_format: post_format,
                media_request_status: 'delivered', media_request_note: nil, ai_generated: ai_generated }
      attrs[:caption] = caption if caption.present?
      update!(attrs)
    end
    true
  end

  def fail_media_request!(note)
    with_lock do
      raise InvalidTransition, 'invalid_transition' unless OPEN_MEDIA_REQUESTS.include?(media_request_status)

      update!(media_request_status: 'failed', media_request_note: note.to_s.strip.first(1_000).presence)
    end
    true
  end

  # Upload order is the album order on Facebook.
  def ordered_media
    media_attachments.sort_by(&:id)
  end

  private

  def transition!(from:)
    with_lock do
      raise InvalidTransition, 'invalid_transition' unless from.include?(status)

      update!(yield)
    end
    true
  end

  def ensure_publishable!
    blockers = publish_blockers
    raise NotPublishable, blockers if blockers.any?
  end

  def format_blockers
    files = media.to_a
    images = files.count { |file| IMAGE_CONTENT_TYPES.include?(file.content_type) }
    videos = files.count { |file| VIDEO_CONTENT_TYPES.include?(file.content_type) }

    case post_format
    when 'text'
      blockers = []
      blockers << 'content_required' if caption.blank? && link_url.blank?
      blockers << 'media_not_allowed' if files.any?
      blockers
    when 'photo' then files.size == 1 && images == 1 ? [] : ['photo_requires_one_image']
    when 'album' then ALBUM_IMAGES.cover?(files.size) && images == files.size ? [] : ['album_requires_2_to_10_images']
    when 'video', 'reel' then files.size == 1 && videos == 1 ? [] : ["#{post_format}_requires_one_video"]
    else []
    end
  end

  def inbox_is_own_facebook_page
    return if inbox && inbox.account_id == account_id && inbox.channel_type == 'Channel::FacebookPage'

    errors.add(:inbox_id, 'must be a Facebook Page inbox of this account')
  end

  def content_plan_is_own
    return if content_plan && content_plan.account_id == account_id

    errors.add(:content_plan_id, 'must belong to this account')
  end

  def acceptable_media
    media.each do |file|
      if IMAGE_CONTENT_TYPES.include?(file.content_type)
        errors.add(:media, 'image is too big') if file.byte_size > IMAGE_MAX_SIZE
      elsif VIDEO_CONTENT_TYPES.include?(file.content_type)
        errors.add(:media, 'video is too big') if file.byte_size > VIDEO_MAX_SIZE
      else
        errors.add(:media, 'filetype not supported')
      end
    end
  end
end
