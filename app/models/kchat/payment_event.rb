# == Schema Information
#
# Table name: kchat_payment_events
#
#  id          :bigint           not null, primary key
#  amount      :bigint           not null
#  description :text
#  raw         :jsonb            not null
#  received_at :datetime         not null
#  status      :string           default("unmatched"), not null
#  tid         :string           not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  account_id  :bigint
#
# Indexes
#
#  index_kchat_payment_events_on_account_id  (account_id)
#  index_kchat_payment_events_on_received_at (received_at)
#  index_kchat_payment_events_on_status      (status)
#  index_kchat_payment_events_on_tid         (tid) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => nullify
#
class Kchat::PaymentEvent < ApplicationRecord
  belongs_to :account, optional: true

  validates :tid, presence: true
  validates :amount, numericality: { only_integer: true, greater_than: 0 }
  validates :received_at, presence: true
end
