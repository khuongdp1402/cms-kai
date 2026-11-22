# == Schema Information
#
# Table name: canned_responses
#
#  id         :integer          not null, primary key
#  content    :text
#  short_code :string
#  tags       :jsonb            not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :integer          not null
#

class CannedResponse < ApplicationRecord
  MAX_TAGS = 10
  MAX_TAG_LENGTH = 40

  before_validation :normalize_short_code_and_tags

  validates :content, presence: true
  validates :short_code, presence: true
  validates :account, presence: true
  validates :short_code, uniqueness: { scope: :account_id }

  belongs_to :account

  scope :with_tag, lambda { |tag|
    cleaned = tag.to_s.strip
    cleaned.present? ? where('canned_responses.tags @> ?', [cleaned].to_json) : all
  }

  scope :order_by_search, lambda { |search|
    term = search.to_s.strip.sub(%r{\A/+}, '')
    short_code_starts_with = sanitize_sql_array(['WHEN short_code ILIKE ? THEN 1', "#{term}%"])
    short_code_like = sanitize_sql_array(['WHEN short_code ILIKE ? THEN 0.6', "%#{term}%"])
    tag_like = sanitize_sql_array(
      ['WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(canned_responses.tags) AS t WHERE t ILIKE ?) THEN 0.4', "%#{term}%"]
    )
    content_like = sanitize_sql_array(['WHEN content ILIKE ? THEN 0.2', "%#{term}%"])

    order_clause = "CASE #{short_code_starts_with} #{short_code_like} #{tag_like} #{content_like} ELSE 0 END"

    order(Arel.sql(order_clause) => :desc)
  }

  private

  def normalize_short_code_and_tags
    self.short_code = short_code.to_s.strip.sub(%r{\A/+}, '') if short_code.present?
    raw = tags.is_a?(String) ? tags.split(',') : Array(tags)
    self.tags = raw.map { |t| t.to_s.strip.first(MAX_TAG_LENGTH) }.compact_blank.uniq.first(MAX_TAGS)
  end
end
