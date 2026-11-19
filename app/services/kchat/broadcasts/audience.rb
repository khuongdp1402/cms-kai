# frozen_string_literal: true

# Resolves who a broadcast targets (labels and/or a saved contact segment) and how many of them each inbox can reach.
class Kchat::Broadcasts::Audience
  EXCLUDED_CHANNELS = %w[Channel::Voice].freeze
  FILTER_ERRORS = [
    CustomExceptions::CustomFilter::InvalidAttribute, CustomExceptions::CustomFilter::InvalidOperator,
    CustomExceptions::CustomFilter::InvalidQueryOperator, CustomExceptions::CustomFilter::InvalidValue
  ].freeze

  def initialize(account, dispatcher: Kchat::Broadcasts::Dispatcher.new(account))
    @account = account
    @dispatcher = dispatcher
  end

  def summary(labels:, segment_id:)
    contact_ids = segment_contact_ids(segment_id)
    {
      audience_count: contacts_scope(labels, contact_ids).count,
      channels: @account.inboxes.where.not(channel_type: EXCLUDED_CHANNELS).order(:id).map do |inbox|
        inbox_stats(inbox, labels: labels, contact_ids: contact_ids, only_24h: false)
      end
    }
  end

  def inbox_stats(inbox, labels:, contact_ids:, only_24h:)
    caps = Kchat::Broadcasts::Channels.capabilities(inbox.channel_type)
    partitioned = @dispatcher.partition_recipients(inbox: inbox, labels: labels, contact_ids: contact_ids,
                                                   enforce_24h: only_24h || caps[:requires_24h_window])
    {
      inbox_id: inbox.id, inbox_name: inbox.name, channel_type: inbox.channel_type.demodulize.underscore,
      requires_24h_window: caps[:requires_24h_window], read_status: caps[:read_status], rate_limit: caps[:rate_limit],
      eligible_count: partitioned[:eligible].size, skipped_24h_count: partitioned[:skipped_24h].size
    }
  end

  # nil = no segment chosen (no restriction); otherwise the ids of the contacts the saved segment matches today.
  def segment_contact_ids(segment_id)
    return nil if segment_id.blank?

    segment = @account.custom_filters.contact.find_by(id: segment_id)
    raise Kchat::BroadcastsService::ValidationError, 'Không tìm thấy nhóm khách đã chọn' if segment.nil?

    params = { payload: Array(segment.query.to_h['payload']) }.with_indifferent_access
    Contacts::FilterService.new(@account, segment.user, params).perform[:contacts].pluck(:id)
  rescue *FILTER_ERRORS
    raise Kchat::BroadcastsService::ValidationError, 'Nhóm khách đã chọn có điều kiện không hợp lệ'
  end

  private

  def contacts_scope(labels, contact_ids)
    scope = @account.contacts
    scope = scope.where(id: contact_ids) unless contact_ids.nil?
    return scope if labels.empty?

    tagged_ids = @account.contacts.tagged_with(labels, any: true).pluck(:id) +
                 @account.conversations.tagged_with(labels, any: true).pluck(:contact_id)
    scope.where(id: tagged_ids.uniq)
  end
end
