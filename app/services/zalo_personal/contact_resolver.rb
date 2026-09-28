# frozen_string_literal: true

class ZaloPersonal::ContactResolver
  def initialize(channel:)
    @channel = channel
    @account = channel.account
  end

  def resolve(provider_user_id:, display_name: nil, avatar_url: nil, phone_number: nil)
    # Check if contact already exists with source_id or phone_number
    contact = @account.contacts.joins(:contact_inboxes).where(
      contact_inboxes: {
        inbox_id: @channel.inbox.id,
        source_id: "zalo_personal:direct:#{provider_user_id}"
      }
    ).first

    if contact.blank? && phone_number.present?
      contact = @account.contacts.find_by(phone_number: phone_number)
    end

    if contact.blank?
      contact = @account.contacts.create!(
        name: display_name.presence || "Zalo User #{provider_user_id.to_s.last(4)}",
        phone_number: phone_number,
        additional_attributes: {
          'zalo_user_id' => provider_user_id
        }
      )
    else
      # Update name if previously generic
      if display_name.present? && (contact.name.blank? || contact.name.start_with?('Zalo User'))
        contact.update(name: display_name)
      end
    end

    # Ensure avatar
    if avatar_url.present? && !contact.avatar.attached?
      begin
        contact.avatar.attach(
          io: Down.open(avatar_url),
          filename: "zalo_avatar_#{provider_user_id}.jpg",
          content_type: 'image/jpeg'
        )
      rescue StandardError => e
        Rails.logger.warn "Failed to attach Zalo avatar for contact #{contact.id}: #{e.message}"
      end
    end

    contact
  end
end
