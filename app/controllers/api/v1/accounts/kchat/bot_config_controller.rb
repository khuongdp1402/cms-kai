# frozen_string_literal: true

# Manages the basic demand-based customer support chatbot config stored in `account.custom_attributes['kchat_bot']`.
class Api::V1::Accounts::Kchat::BotConfigController < Api::V1::Accounts::Kchat::BaseController
  MAX_RULES = 30
  MAX_KEYWORDS = 20
  MAX_PRODUCTS_PER_RULE = 10
  MAX_LABELS_PER_RULE = 10

  before_action :check_admin_authorization?, only: :update

  def show
    render json: ::Kchat::DemandBotService.config_for(Current.account)
  end

  def update
    sanitized = sanitize_config
    Current.account.update!(custom_attributes: Current.account.custom_attributes.to_h.merge('kchat_bot' => sanitized))
    render json: ::Kchat::DemandBotService.config_for(Current.account)
  end

  private

  def sanitize_config
    {
      'enabled' => cast_bool(params[:enabled], false),
      'pause_when_agent_active' => cast_bool(params[:pause_when_agent_active], true),
      'welcome_enabled' => cast_bool(params[:welcome_enabled], true),
      'welcome_message' => params[:welcome_message].to_s.strip.first(1_000),
      'auto_suggest_products' => cast_bool(params[:auto_suggest_products], true),
      'handoff_enabled' => cast_bool(params[:handoff_enabled], false),
      'handoff_message' => params[:handoff_message].to_s.strip.first(500),
      'rules' => sanitize_rules
    }
  end

  def sanitize_rules
    Array(params[:rules]).first(MAX_RULES).filter_map { |rule| normalize_rule_hash(rule) }
  end

  def normalize_rule_hash(rule)
    hash = rule.respond_to?(:to_unsafe_h) ? rule.to_unsafe_h : rule.to_h
    keywords = Array(hash['keywords']).map { |k| k.to_s.strip.first(60) }.compact_blank.uniq.first(MAX_KEYWORDS)
    reply = hash['reply'].to_s.strip.first(1_500)
    product_ids = sanitize_product_ids(hash['product_ids'])
    return nil if keywords.empty? && reply.empty? && product_ids.empty?

    build_rule(hash, keywords, reply, product_ids)
  end

  def build_rule(hash, keywords, reply, product_ids)
    {
      'id' => hash['id'].presence.to_s.first(60).presence || SecureRandom.hex(6),
      'name' => hash['name'].to_s.strip.first(100).presence || 'Kịch bản tự động',
      'active' => cast_bool(hash['active'], true),
      'keywords' => keywords,
      'reply' => reply,
      'product_ids' => product_ids,
      'assign_labels' => Array(hash['assign_labels']).map { |l| l.to_s.strip.first(40) }.compact_blank.uniq.first(MAX_LABELS_PER_RULE)
    }
  end

  def sanitize_product_ids(raw_ids)
    ids = Array(raw_ids).filter_map { |id| id.to_i if id.to_i.positive? }.uniq.first(MAX_PRODUCTS_PER_RULE)
    return [] if ids.empty?

    ::Kchat::Product.where(account_id: Current.account.id, id: ids).pluck(:id)
  end

  def cast_bool(value, default)
    return default if value.nil?

    ActiveModel::Type::Boolean.new.cast(value)
  end
end
