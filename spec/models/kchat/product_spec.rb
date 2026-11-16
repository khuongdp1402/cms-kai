require 'rails_helper'

RSpec.describe Kchat::Product do
  let(:account) { create(:account) }

  it 'is valid with name and price' do
    expect(described_class.new(account: account, name: 'Áo thun', price: 150_000)).to be_valid
  end

  it 'requires a name' do
    expect(described_class.new(account: account, price: 1)).not_to be_valid
  end

  it 'rejects a negative price' do
    expect(described_class.new(account: account, name: 'x', price: -1)).not_to be_valid
  end

  it 'allows nil stock (untracked) but not negative stock' do
    expect(described_class.new(account: account, name: 'x', price: 1, stock: nil)).to be_valid
    expect(described_class.new(account: account, name: 'x', price: 1, stock: -1)).not_to be_valid
  end

  it 'defaults to active' do
    expect(described_class.new.active).to be(true)
  end
end
