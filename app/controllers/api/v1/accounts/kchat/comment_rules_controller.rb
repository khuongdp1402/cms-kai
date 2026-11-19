# frozen_string_literal: true

class Api::V1::Accounts::Kchat::CommentRulesController < Api::V1::Accounts::Kchat::BaseController
  before_action :check_admin_authorization?, only: [:update]

  def show
    render json: { rules: rules_service.rules }
  end

  def update
    render json: { rules: rules_service.update(comment_rules_params) }
  end

  private

  def rules_service
    @rules_service ||= Kchat::SocialComments::RulesService.new(Current.account)
  end

  def comment_rules_params
    params.permit(:enabled, :auto_hide_phone, :auto_private_reply, :private_reply_template, :hide_keywords, hide_keywords: [])
  end
end
