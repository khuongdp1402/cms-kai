require 'rails_helper'

RSpec.describe Kchat::PaymentEvent do
  let(:attrs) { { tid: 'T1', amount: 100_000, description: 'KALO 1 STARTER', received_at: Time.current } }

  it 'is valid without an account (unmatched payment)' do
    expect(described_class.new(attrs)).to be_valid
  end

  it 'requires a tid and a positive amount' do
    expect(described_class.new(attrs.merge(tid: nil))).not_to be_valid
    expect(described_class.new(attrs.merge(amount: 0))).not_to be_valid
  end

  it 'enforces tid uniqueness at the database level' do
    described_class.create!(attrs)
    expect { described_class.new(attrs).save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
  end
end
