require 'rails_helper'

RSpec.describe Kchat::Publishing::DuePostsJob do
  let(:account) { create(:account) }

  def create_post(attrs)
    Kchat::Post.create!({ account: account, caption: 'Xin chào' }.merge(attrs))
  end

  it 'enqueues due approved posts only' do
    due = create_post(status: 'approved', scheduled_at: 1.minute.ago)
    create_post(status: 'approved', scheduled_at: 1.hour.from_now)
    create_post(status: 'draft', scheduled_at: 1.minute.ago)

    expect { described_class.perform_now }.to have_enqueued_job(Kchat::Publishing::PublishPostJob).with(due.id).exactly(:once)
  end

  it 'fails publish runs that stalled' do
    stalled = create_post(status: 'publishing', scheduled_at: 1.hour.ago, publishing_started_at: 30.minutes.ago)

    described_class.perform_now

    expect(stalled.reload).to have_attributes(status: 'failed', error_code: 'publish_unknown')
  end
end
