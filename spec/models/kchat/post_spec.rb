require 'rails_helper'

RSpec.describe Kchat::Post do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:page_channel) { create(:channel_facebook_page, account: account) }
  let(:page_inbox) { create(:inbox, channel: page_channel, account: account) }
  let(:png) { Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/avatar.png'), 'image/png') }
  let(:mp4) { Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/sample.mp4'), 'video/mp4') }

  def build_post(attrs = {})
    described_class.new({ account: account, inbox: page_inbox, caption: 'Sản phẩm mới', scheduled_at: 1.hour.from_now }.merge(attrs))
  end

  describe 'validations' do
    it 'rejects an inbox from another account' do
      foreign_channel = create(:channel_facebook_page)
      foreign_inbox = create(:inbox, channel: foreign_channel, account: foreign_channel.account)
      post = build_post(inbox: foreign_inbox)
      expect(post).not_to be_valid
      expect(post.errors[:inbox_id]).to be_present
    end

    it 'rejects an inbox that is not a Facebook Page' do
      post = build_post(inbox: create(:inbox, account: account))
      expect(post).not_to be_valid
    end

    it 'rejects unsupported media types' do
      post = build_post(post_format: 'photo')
      post.media.attach(Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/sample.pdf'), 'application/pdf'))
      expect(post).not_to be_valid
      expect(post.errors[:media]).to be_present
    end
  end

  describe '#publish_blockers' do
    it 'is empty for a complete text post' do
      expect(build_post.publish_blockers).to eq([])
    end

    it 'lists missing page, schedule and content' do
      post = build_post(inbox: nil, scheduled_at: nil, caption: nil)
      expect(post.publish_blockers).to contain_exactly('inbox_required', 'schedule_required', 'content_required')
    end

    it 'checks the media count per format' do
      photo = build_post(post_format: 'photo')
      expect(photo.publish_blockers).to eq(['photo_requires_one_image'])

      album = build_post(post_format: 'album')
      album.media.attach(png)
      expect(album.publish_blockers).to eq(['album_requires_2_to_10_images'])

      video = build_post(post_format: 'video')
      video.media.attach(png)
      expect(video.publish_blockers).to eq(['video_requires_one_video'])

      video_ok = build_post(post_format: 'video')
      video_ok.media.attach(mp4)
      expect(video_ok.publish_blockers).to eq([])

      expect(build_post(post_format: 'reel').publish_blockers).to eq(['reel_requires_one_video'])
    end

    it 'blocks the brand hard bans and the default ones' do
      account.update!(custom_attributes: { 'brand_growth' => { 'profile' => { 'hard_bans' => 'rẻ nhất' } } })
      expect(build_post(caption: 'Hàng rẻ nhất chợ').publish_blockers).to eq(['banned_phrases'])
      expect(build_post(caption: 'Chất lượng tốt nhất thế giới').publish_blockers).to eq(['banned_phrases'])
    end
  end

  describe 'review flow' do
    let(:post) { build_post.tap(&:save!) }

    it 'goes draft -> pending_approval -> approved' do
      post.submit!
      expect(post.reload.status).to eq('pending_approval')

      post.approve!(admin)
      expect(post.reload).to have_attributes(status: 'approved', approved_by: admin)
      expect(post.approved_at).to be_present
    end

    it 'refuses to submit an incomplete post' do
      post.update!(scheduled_at: nil)
      expect { post.submit! }.to raise_error(an_instance_of(described_class::NotPublishable).and(having_attributes(blockers: ['schedule_required'])))
      expect(post.reload.status).to eq('draft')
    end

    it 'refuses to approve a schedule in the past' do
      post.submit!
      post.update_column(:scheduled_at, 1.hour.ago) # rubocop:disable Rails/SkipsModelValidations
      expect { post.approve!(admin) }.to raise_error(an_instance_of(described_class::NotPublishable).and(having_attributes(blockers: ['schedule_in_past'])))
    end

    it 'rejects back to draft with a note' do
      post.submit!
      post.reject!('Sửa giá')
      expect(post.reload).to have_attributes(status: 'draft', review_note: 'Sửa giá')
    end

    it 'does not approve a draft' do
      expect { post.approve!(admin) }.to raise_error(described_class::InvalidTransition)
    end
  end

  describe '#claim_for_publishing!' do
    let(:post) { build_post(status: 'approved', scheduled_at: 1.minute.ago).tap(&:save!) }

    it 'claims a due approved post once' do
      expect(post.claim_for_publishing!).to be(true)
      expect(post.reload).to have_attributes(status: 'publishing', attempts: 1)
      expect(described_class.find(post.id).claim_for_publishing!).to be(false)
    end

    it 'does not claim a post that is not due yet' do
      post.update!(scheduled_at: 1.hour.from_now)
      expect(post.claim_for_publishing!).to be(false)
    end
  end

  describe '#mark_stalled!' do
    it 'fails a publish run that never finished as publish_unknown' do
      post = build_post(status: 'publishing', publishing_started_at: 20.minutes.ago).tap(&:save!)
      post.mark_stalled!
      expect(post.reload).to have_attributes(status: 'failed', error_code: 'publish_unknown')
    end

    it 'leaves a recent publish run alone' do
      post = build_post(status: 'publishing', publishing_started_at: 1.minute.ago).tap(&:save!)
      post.mark_stalled!
      expect(post.reload.status).to eq('publishing')
    end
  end
end
