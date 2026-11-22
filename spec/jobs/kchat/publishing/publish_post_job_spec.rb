require 'rails_helper'

RSpec.describe Kchat::Publishing::PublishPostJob do
  let(:account) { create(:account) }
  let(:channel) { create(:channel_facebook_page, account: account) }
  let(:inbox) { create(:inbox, channel: channel, account: account) }
  let(:post) do
    Kchat::Post.create!(account: account, inbox: inbox, caption: 'Xin chào', status: 'approved', scheduled_at: 1.minute.ago)
  end
  let(:publisher) { instance_double(Kchat::Publishing::FacebookPublisher) }

  before do
    account.enable_features!('kalo_auto_posting')
    allow(Kchat::Publishing::FacebookPublisher).to receive(:new).and_return(publisher)
  end

  it 'publishes a due post and stores the Facebook id' do
    allow(publisher).to receive(:publish!).and_return(external_post_id: 'PAGE_1', permalink: 'https://www.facebook.com/PAGE_1')

    described_class.perform_now(post.id)

    expect(post.reload).to have_attributes(status: 'published', external_post_id: 'PAGE_1', attempts: 1)
    expect(post.published_at).to be_present
  end

  it 'publishes only once when run twice' do
    allow(publisher).to receive(:publish!).and_return(external_post_id: 'PAGE_1', permalink: nil)

    2.times { described_class.perform_now(post.id) }

    expect(publisher).to have_received(:publish!).once
  end

  it 'does nothing for a post that is not due' do
    post.update!(scheduled_at: 1.hour.from_now)
    allow(publisher).to receive(:publish!)

    described_class.perform_now(post.id)

    expect(publisher).not_to have_received(:publish!)
    expect(post.reload.status).to eq('approved')
  end

  it 'reschedules a retryable error and fails after the last attempt' do
    error = Kchat::Publishing::Error.new('rate_limited', 'slow down', retryable: true)
    allow(publisher).to receive(:publish!).and_raise(error)

    expect { described_class.perform_now(post.id) }.to have_enqueued_job(described_class).with(post.id)
    expect(post.reload).to have_attributes(status: 'approved', error_code: 'rate_limited', attempts: 1)
    expect(post.scheduled_at).to be > Time.current

    post.update!(scheduled_at: 1.minute.ago, attempts: Kchat::Post::MAX_PUBLISH_ATTEMPTS - 1)
    described_class.perform_now(post.id)
    expect(post.reload).to have_attributes(status: 'failed', error_code: 'rate_limited')
  end

  it 'fails at once on a non retryable error' do
    allow(publisher).to receive(:publish!).and_raise(Kchat::Publishing::Error.new('token_invalid', 'expired'))

    expect { described_class.perform_now(post.id) }.not_to have_enqueued_job(described_class)
    expect(post.reload).to have_attributes(status: 'failed', error_code: 'token_invalid', error_message: 'expired')
  end

  it 'fails without publishing when the shop turned auto posting off' do
    account.disable_features!('kalo_auto_posting')
    allow(publisher).to receive(:publish!)

    described_class.perform_now(post.id)

    expect(publisher).not_to have_received(:publish!)
    expect(post.reload).to have_attributes(status: 'failed', error_code: 'feature_disabled')
  end

  it 'fails without publishing when the subscription expired' do
    account.update_columns(created_at: 30.days.ago) # rubocop:disable Rails/SkipsModelValidations
    allow(publisher).to receive(:publish!)

    described_class.perform_now(post.id)

    expect(publisher).not_to have_received(:publish!)
    expect(post.reload).to have_attributes(status: 'failed', error_code: 'subscription_expired')
  end
end
