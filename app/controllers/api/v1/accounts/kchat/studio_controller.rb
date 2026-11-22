# API for the media studio (Omni-Viral Studio, ADR-032). The studio runs on the creator's machine and calls
# Kalo with a Kalo user's `api_access_token`; Kalo never calls the studio.
#   GET  studio/requests                 media requests to produce (with the brand profile)
#   POST studio/requests/:id/claim       requested -> in_production
#   POST studio/requests/:id/deliver     upload the media; the post stays a draft that a person approves
#   POST studio/requests/:id/fail        give up with a note (action `fail_request`)
#   POST studio/posts                    push a finished studio video as a new draft (idempotent on source_ref)
class Api::V1::Accounts::Kchat::StudioController < Api::V1::Accounts::Kchat::BaseController
  DELIVERABLE_FORMATS = %w[photo album video reel].freeze

  before_action :require_auto_posting!
  before_action :require_active_subscription!, only: [:deliver, :create_post]
  before_action :fetch_request, only: [:claim, :deliver, :fail_request]

  rescue_from ::Kchat::Post::InvalidTransition, with: -> { render_kchat_error('invalid_transition', :unprocessable_entity) }

  def requests
    authorize ::Kchat::Post, :index?
    @posts = ::Kchat::Post.where(account_id: Current.account.id).open_media_requests
                          .includes(:account, :inbox, :approved_by, media_attachments: :blob).order(:media_requested_at, :id)
    @brand_profile = Current.account.custom_attributes.to_h.dig('brand_growth', 'profile') || {}
  end

  def claim
    authorize @post, :update?
    @post.claim_media_request!
    render 'api/v1/accounts/kchat/posts/show'
  end

  def deliver
    authorize @post, :update?
    files = uploaded_media
    return render_kchat_error('media_required', :unprocessable_entity) if files.empty?

    @post.deliver_media!(files: files, post_format: deliverable_format(files), caption: caption_param, ai_generated: ai_generated_param)
    render 'api/v1/accounts/kchat/posts/show'
  end

  def fail_request
    authorize @post, :update?
    @post.fail_media_request!(params[:note])
    render 'api/v1/accounts/kchat/posts/show'
  end

  # A video the creator made on their own in the studio, sent to Kalo for review and scheduling.
  def create_post
    authorize ::Kchat::Post, :create?
    source_ref = params[:source_ref].to_s.strip
    return render_kchat_error('source_ref_required', :unprocessable_entity) if source_ref.blank?

    @post = ::Kchat::Post.find_by(account_id: Current.account.id, source: 'studio', source_ref: source_ref)
    return render('api/v1/accounts/kchat/posts/show', status: :ok) if @post

    files = uploaded_media
    return render_kchat_error('media_required', :unprocessable_entity) if files.empty?

    @post = ::Kchat::Post.new(account: Current.account, created_by: Current.user, status: 'draft', source: 'studio',
                              source_ref: source_ref, inbox_id: params[:inbox_id].presence, caption: caption_param,
                              post_format: deliverable_format(files), ai_generated: ai_generated_param)
    @post.media.attach(files)
    return render_invalid(@post) unless @post.save

    render 'api/v1/accounts/kchat/posts/show', status: :created
  end

  private

  def require_auto_posting!
    render_kchat_error('feature_disabled', :forbidden) unless Current.account.feature_enabled?('kalo_auto_posting')
  end

  def fetch_request
    @post = ::Kchat::Post.find_by(account_id: Current.account.id, id: params[:id])
    render_not_found unless @post
  end

  def uploaded_media
    Array(params[:media]).select { |file| file.respond_to?(:read) }
  end

  def caption_param
    params[:caption].to_s.strip.presence
  end

  def ai_generated_param
    ActiveModel::Type::Boolean.new.cast(params[:ai_generated]) || false
  end

  # The studio may say `post_format`; otherwise one video is a Reel and images are a photo or an album.
  def deliverable_format(files)
    requested = params[:post_format].to_s
    return requested if DELIVERABLE_FORMATS.include?(requested)

    videos = files.count { |file| ::Kchat::Post::VIDEO_CONTENT_TYPES.include?(file.content_type) }
    return 'reel' if videos.positive?

    files.size > 1 ? 'album' : 'photo'
  end
end
