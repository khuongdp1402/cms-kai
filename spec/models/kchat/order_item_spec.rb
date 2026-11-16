require 'rails_helper'

RSpec.describe Kchat::OrderItem do
  let(:account) { create(:account) }
  let(:order) do
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'manual', payment_method: 'cod' },
                                    items: [{ name: 'A', unit_price: 10, quantity: 1 }])
  end

  it 'belongs to an order and keeps a product snapshot' do
    item = order.items.first
    expect(item).to have_attributes(name: 'A', unit_price: 10, quantity: 1, product_id: nil)
  end

  it 'rejects zero or negative quantity and negative price' do
    expect(described_class.new(order: order, name: 'x', unit_price: 1, quantity: 0)).not_to be_valid
    expect(described_class.new(order: order, name: 'x', unit_price: 1, quantity: -2)).not_to be_valid
    expect(described_class.new(order: order, name: 'x', unit_price: -1, quantity: 1)).not_to be_valid
  end

  it 'requires a name' do
    expect(described_class.new(order: order, unit_price: 1, quantity: 1)).not_to be_valid
  end
end
