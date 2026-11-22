class Api::V1::Accounts::CannedResponsesController < Api::V1::Accounts::BaseController
  before_action :fetch_canned_response, only: [:update, :destroy]

  def index
    render json: canned_responses
  end

  def create
    @canned_response = Current.account.canned_responses.new(canned_response_params)
    @canned_response.save!
    render json: @canned_response
  end

  def update
    @canned_response.update!(canned_response_params)
    render json: @canned_response
  end

  def destroy
    @canned_response.destroy!
    head :ok
  end

  private

  def fetch_canned_response
    @canned_response = Current.account.canned_responses.find(params[:id])
  end

  def canned_response_params
    permitted = params.permit(:short_code, :content, :tags, tags: [])
    if params[:canned_response].is_a?(ActionController::Parameters)
      permitted = params.require(:canned_response).permit(:short_code, :content, :tags, tags: [])
    end
    permitted
  end

  def canned_responses
    scope = Current.account.canned_responses
    scope = scope.with_tag(params[:tag]) if params[:tag].present?
    term = params[:search].to_s.strip.sub(%r{\A/+}, '')
    return scope if term.blank?

    pattern = "%#{term}%"
    scope.where(
      'short_code ILIKE :search OR content ILIKE :search OR ' \
      'EXISTS (SELECT 1 FROM jsonb_array_elements_text(canned_responses.tags) AS t WHERE t ILIKE :search)',
      search: pattern
    ).order_by_search(term)
  end
end
