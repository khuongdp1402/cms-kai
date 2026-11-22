# == Schema Information
#
# Table name: kchat_content_plans
#
#  id             :bigint           not null, primary key
#  brief          :jsonb            not null
#  ends_on        :date
#  goal           :string
#  pillars        :jsonb            not null
#  posts_per_week :integer
#  starts_on      :date
#  status         :string           default("draft"), not null
#  title          :string           not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  account_id     :bigint           not null
#
# Indexes
#
#  index_kchat_content_plans_on_account_id  (account_id)
#
# Foreign Keys
#
#  fk_rails_...  (account_id => accounts.id) ON DELETE => cascade
#
# A PR plan for one period (ADR-031). The AI planner fills `brief` and `pillars`; posts belong to it.
class Kchat::ContentPlan < ApplicationRecord
  GOALS = %w[awareness sales launch retention].freeze
  STATUSES = %w[draft active archived].freeze

  belongs_to :account
  has_many :posts, class_name: 'Kchat::Post', dependent: :nullify

  validates :title, presence: true, length: { maximum: 160 }
  validates :goal, inclusion: { in: GOALS }, allow_nil: true
  validates :status, inclusion: { in: STATUSES }
  validates :posts_per_week, numericality: { only_integer: true, in: 1..35 }, allow_nil: true
  validate :period_is_ordered

  private

  def period_is_ordered
    return if starts_on.blank? || ends_on.blank? || ends_on >= starts_on

    errors.add(:ends_on, 'must be on or after starts_on')
  end
end
