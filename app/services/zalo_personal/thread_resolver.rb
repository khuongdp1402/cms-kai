# frozen_string_literal: true

class ZaloPersonal::ThreadResolver
  def initialize(channel:)
    @channel = channel
    @inbox = channel.inbox
    @account = channel.account
  end

  def resolve(provider_thread_id:, thread_type: :direct, name: nil, avatar_url: nil, sender_info: nil)
    is_group = thread_type.to_s == 'group'
    source_id = is_group ? "zalo_personal:group:#{provider_thread_id}" : "zalo_personal:direct:#{provider_thread_id}"

    contact_inbox = @inbox.contact_inboxes.find_by(source_id: source_id)

    if contact_inbox.blank?
      contact = if is_group
                  # Synthetic Group Contact
                  @account.contacts.create!(
                    name: name.presence || "Zalo Group #{provider_thread_id.to_s.last(4)}",
                    additional_attributes: {
                      'is_group' => true,
                      'zalo_group_id' => provider_thread_id
                    }
                  )
                else
                  # Direct Contact
                  ZaloPersonal::ContactResolver.new(channel: @channel).resolve(
                    provider_user_id: provider_thread_id,
                    display_name: sender_info&.dig(:name) || name,
                    avatar_url: sender_info&.dig(:avatar_url) || avatar_url
                  )
                end

      contact_inbox = @inbox.contact_inboxes.create!(
        contact: contact,
        source_id: source_id
      )
    else
      contact = contact_inbox.contact
      if is_group && name.present? && (contact.name.blank? || contact.name.start_with?('Zalo Group'))
        contact.update(name: name)
      end
    end

    if is_group && avatar_url.present? && !contact.avatar.attached?
      begin
        contact.avatar.attach(
          io: Down.open(avatar_url),
          filename: "zalo_group_avatar_#{provider_thread_id}.jpg",
          content_type: 'image/jpeg'
        )
      rescue StandardError => e
        Rails.logger.warn "Failed to attach Zalo group avatar for contact #{contact.id}: #{e.message}"
      end
    end

    thread_record = @channel.threads.find_or_initialize_by(
      provider_thread_id: provider_thread_id,
      thread_type: is_group ? :group : :direct
    )

    thread_record.provider_metadata ||= {}
    thread_record.contact_inbox = contact_inbox
    thread_record.name = name if name.present?
    thread_record.avatar_url = avatar_url if avatar_url.present?
    thread_record.last_synced_at = Time.current
    thread_record.save!

    {
      thread: thread_record,
      contact_inbox: contact_inbox,
      conversation: resolve_conversation(contact_inbox)
    }
  end

  private

  def resolve_conversation(contact_inbox)
    conversation = ::Conversation.where(
      account_id: @account.id,
      inbox_id: @inbox.id,
      contact_inbox_id: contact_inbox.id
    ).first

    conversation || ::Conversation.create!(
      account_id: @account.id,
      inbox_id: @inbox.id,
      contact_inbox_id: contact_inbox.id,
      contact_id: contact_inbox.contact_id,
      status: :open
    )
  end
end
