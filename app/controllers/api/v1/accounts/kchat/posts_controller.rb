# Facebook Page posts that agents draft, an admin approves and Kalo publishes on schedule (ADR-031).
class Api::V1::Accounts::Kchat::PostsController < Api::V1::Accounts::Kchat::BaseController
  INDEX_LIMIT = 500

  before_action :require_auto_posting!
  before_action :require_active_subscription!, only: [:create, :update, :submit, :approve, :retry_publish]
  before_action :fetch_post, except: [:index, :create]

  rescue_from ::Kchat::Post::InvalidTransition, with: -> { render_kchat_error('invalid_transition', :unprocessable_entity) }
  rescue_from ::Kchat::Post::NotPublishable, with: ->(e) { render_kchat_error('not_publishable', :unprocessable_entity, blockers: e.blockers) }

  def index
    authorize ::Kchat::Post
    @posts = filtered_posts
  end

  def show
    authorize @post
  end

  def create
    authorize ::Kchat::Post
    @post = ::Kchat::Post.new(post_params.merge(account: Current.account, created_by: Current.user, status: 'draft'))
    attach_media(@post)
    return render_invalid(@post) unless @post.save

    render :show, status: :created
  end

  # Any edit sends the post back to draft: what was approved is no longer what will be published.
  def update
    authorize @post
    return render_kchat_error('invalid_transition', :unprocessable_entity) unless ::Kchat::Post::EDITABLE_STATUSES.include?(@post.status)

    @post.with_lock do
      @post.assign_attributes(post_params.merge(status: 'draft', approved_by: nil, approved_at: nil))
      remove_media(@post)
      attach_media(@post)
      @post.save!
    end
    @post.reload
    render :show
  end

  def destroy
    authorize @post
    @post.with_lock do
      raise ::Kchat::Post::InvalidTransition unless ::Kchat::Post::DELETABLE_STATUSES.include?(@post.status)

      @post.destroy!
    end
    head :no_content
  end

  def submit
    authorize @post
    @post.submit!
    render :show
  end

  def approve
    authorize @post
    @post.approve!(Current.user)
    ::Kchat::Publishing::PublishPostJob.set(wait_until: @post.scheduled_at).perform_later(@post.id)
    render :show
  end

  def reject
    authorize @post
    @post.reject!(params[:note])
    render :show
  end

  def unapprove
    authorize @post
    @post.unapprove!
    render :show
  end

  # Asks the media studio to produce what `media_brief` describes (ADR-032).
  def request_media
    authorize @post, :update?
    @post.request_media!(params[:note])
    render :show
  end

  def retry_publish
    authorize @post
    @post.retry!(Current.user)
    ::Kchat::Publishing::PublishPostJob.perform_later(@post.id)
    render :show
  end

  private

  def require_auto_posting!
    render_kchat_error('feature_disabled', :forbidden) unless Current.account.feature_enabled?('kalo_auto_posting')
  end

  def fetch_post
    @post = ::Kchat::Post.find_by(account_id: Current.account.id, id: params[:id])
    render_not_found unless @post
  end

  def post_params
    params.permit(:inbox_id, :content_plan_id, :post_format, :caption, :link_url, :pillar, :media_brief, :scheduled_at)
  end

  def attach_media(post)
    files = Array(params[:media]).select { |file| file.respond_to?(:read) }
    post.media.attach(files) if files.any?
  end

  def remove_media(post)
    ids = Array(params[:remove_media_ids]).map(&:to_i)
    # destroy (not purge_later): the blob is purged after commit, so a failed save keeps the file.
    post.media_attachments.where(id: ids).destroy_all if ids.any?
  end

  def filtered_posts
    scope = ::Kchat::Post.where(account_id: Current.account.id).includes(:account, :inbox, :approved_by, media_attachments: :blob)
    scope = scope.where(status: params[:status].to_s) if params[:status].present?
    scope = scope.where(inbox_id: params[:inbox_id].to_i) if params[:inbox_id].present?
    scope = scope.where(scheduled_at: parse_time(params[:from])..) if params[:from].present?
    scope = scope.where(scheduled_at: ..parse_time(params[:to])) if params[:to].present?
    scope.order(Arel.sql('scheduled_at ASC NULLS LAST'), :id).limit(INDEX_LIMIT)
  end

  def parse_time(value)
    Time.zone.parse(value.to_s) || raise(ArgumentError)
  rescue ArgumentError
    raise ActionController::BadRequest, 'invalid time'
  end
end
