require 'rails_helper'

RSpec.describe Kchat::Order do
  let(:account) { create(:account) }
  let(:base) { { source: 'manual', payment_method: 'transfer_qr' } }
  let(:free_item) { { name: 'Phí', unit_price: 1000, quantity: 2 } }

  def build_order(acct = account, attributes: base, items: [free_item])
    described_class.create_with_items!(account: acct, attributes: attributes, items: items)
  end

  it 'assigns numbers 1001, 1002 per account independently' do
    other = create(:account)
    expect([build_order.number, build_order.number, build_order(other).number]).to eq([1001, 1002, 1001])
  end

  it 'computes subtotal and total' do
    order = build_order(attributes: base.merge(shipping_fee: 30_000))
    expect(order).to have_attributes(subtotal: 2000, shipping_fee: 30_000, total: 32_000, status: 'pending_payment')
  end

  it 'takes name and price from a product line' do
    product = Kchat::Product.create!(account: account, name: 'Áo', price: 150_000)
    order = build_order(items: [{ product_id: product.id, quantity: 2 }])
    expect(order.items.first).to have_attributes(name: 'Áo', unit_price: 150_000, product_id: product.id)
    expect(order.total).to eq(300_000)
  end

  it 'refuses a product from another account' do
    product = Kchat::Product.create!(account: create(:account), name: 'Áo', price: 1)
    expect { build_order(items: [{ product_id: product.id, quantity: 1 }]) }.to raise_error(ActiveRecord::RecordNotFound)
  end

  describe 'validation' do
    it 'rejects zero or negative quantity and negative price' do
      [{ unit_price: 1, quantity: 0 }, { unit_price: 1, quantity: -1 }, { unit_price: -5, quantity: 1 }].each do |attrs|
        item = attrs.merge(name: 'x')
        expect { build_order(items: [item]) }.to raise_error(ActiveRecord::RecordInvalid)
      end
      expect(described_class.count).to eq(0)
    end

    it 'rejects total above 9_999_999_999' do
      expect { build_order(items: [{ name: 'x', unit_price: 10_000_000_000, quantity: 1 }]) }.to raise_error(ActiveRecord::RecordInvalid)
      expect { build_order(items: [{ name: 'x', unit_price: 5_000_000_000, quantity: 2 }], attributes: base.merge(shipping_fee: 1)) }
        .to raise_error(ActiveRecord::RecordInvalid)
      expect(build_order(items: [{ name: 'x', unit_price: 9_999_999_999, quantity: 1 }]).total).to eq(9_999_999_999)
    end

    it 'rejects an order without items, a free line without name or price, and unknown enums' do
      expect { build_order(items: []) }.to raise_error(ActiveRecord::RecordInvalid)
      expect { build_order(items: [{ quantity: 1 }]) }.to raise_error(ActiveRecord::RecordInvalid)
      expect { build_order(attributes: base.merge(payment_method: 'bitcoin')) }.to raise_error(ActiveRecord::RecordInvalid)
    end
  end

  describe 'stock' do
    it 'decrements stock of tracked products and leaves untracked products alone' do
      tracked = Kchat::Product.create!(account: account, name: 'T', price: 10, stock: 5)
      untracked = Kchat::Product.create!(account: account, name: 'U', price: 10, stock: nil)
      build_order(items: [{ product_id: tracked.id, quantity: 2 }, { product_id: untracked.id, quantity: 9 }])
      expect(tracked.reload.stock).to eq(3)
      expect(untracked.reload.stock).to be_nil
    end

    it 'raises InsufficientStock with product_id and creates nothing' do
      p1 = Kchat::Product.create!(account: account, name: 'A', price: 10, stock: 5)
      p2 = Kchat::Product.create!(account: account, name: 'B', price: 10, stock: 1)
      expect { build_order(items: [{ product_id: p1.id, quantity: 1 }, { product_id: p2.id, quantity: 2 }]) }
        .to raise_error(described_class::InsufficientStock) { |e| expect(e.product_id).to eq(p2.id) }
      expect(p1.reload.stock).to eq(5)
      expect(described_class.count).to eq(0)
    end

    it 'sums quantities of repeated lines of the same product' do
      product = Kchat::Product.create!(account: account, name: 'A', price: 10, stock: 3)
      expect { build_order(items: [{ product_id: product.id, quantity: 2 }, { product_id: product.id, quantity: 2 }]) }
        .to raise_error(described_class::InsufficientStock)
    end

    it 'cancel restores stock' do
      product = Kchat::Product.create!(account: account, name: 'A', price: 10, stock: 5)
      order = build_order(items: [{ product_id: product.id, quantity: 3 }])
      expect(product.reload.stock).to eq(2)
      order.transition!(:cancel)
      expect(product.reload.stock).to eq(5)
      expect(order.status).to eq('cancelled')
    end
  end

  describe 'concurrency', :aggregate_failures do
    self.use_transactional_tests = false

    after do
      Kchat::OrderItem.delete_all
      described_class.delete_all
      Kchat::Product.delete_all
      account.destroy
    end

    it 'two threads buying the last unit: one succeeds, one raises InsufficientStock, stock is 0' do
      product = Kchat::Product.create!(account: account, name: 'Last', price: 10, stock: 1)
      base && free_item # memoise lets before threads start
      results = Array.new(2) do
        Thread.new do
          ActiveRecord::Base.connection_pool.with_connection do
            build_order(items: [{ product_id: product.id, quantity: 1 }])
          rescue described_class::InsufficientStock => e
            e
          end
        end
      end.map(&:value)

      expect(results.count { |r| r.is_a?(described_class) }).to eq(1)
      expect(results.count { |r| r.is_a?(described_class::InsufficientStock) }).to eq(1)
      expect(product.reload.stock).to eq(0)
    end

    it 'never issues duplicate numbers under concurrent creation' do
      base && free_item && account
      numbers = Array.new(5) do
        Thread.new { ActiveRecord::Base.connection_pool.with_connection { build_order.number } }
      end.map(&:value)
      expect(numbers.sort).to eq((1001..1005).to_a)
    end
  end

  describe 'payment methods' do
    it 'creates cash and card orders as paid with paid_at set' do
      %w[cash card].each do |method|
        order = build_order(attributes: base.merge(payment_method: method))
        expect(order.status).to eq('paid')
        expect(order.paid_at).to be_present
      end
    end

    it 'creates transfer_qr and cod orders as pending_payment without paid_at' do
      %w[transfer_qr cod].each do |method|
        order = build_order(attributes: base.merge(payment_method: method))
        expect([order.status, order.paid_at]).to eq(['pending_payment', nil])
      end
    end

    it 'cod complete sets paid_at' do
      order = build_order(attributes: base.merge(payment_method: 'cod'))
      order.transition!(:ship)
      expect(order.status).to eq('shipping')
      expect(order.paid_at).to be_nil
      order.transition!(:complete)
      expect(order).to have_attributes(status: 'completed')
      expect(order.paid_at).to be_present
    end
  end

  describe '#transition!' do
    allowed = {
      %w[pending_payment mark_paid] => 'paid',
      %w[pending_payment ship] => 'shipping', # only cod
      %w[paid ship] => 'shipping',
      %w[shipping complete] => 'completed',
      %w[pending_payment cancel] => 'cancelled',
      %w[paid cancel] => 'cancelled'
    }
    statuses = %w[pending_payment paid shipping completed cancelled]
    events = %w[mark_paid ship complete cancel]

    def order_in(status, method: 'transfer_qr')
      order = build_order(attributes: base.merge(payment_method: method))
      order.update_columns(status: status) # rubocop:disable Rails/SkipsModelValidations
      order
    end

    it 'mark_paid sets paid_at and returns self' do
      order = build_order
      expect(order.transition!(:mark_paid)).to equal(order)
      expect(order).to have_attributes(status: 'paid')
      expect(order.paid_at).to be_present
    end

    statuses.product(events).each do |status, event|
      next if allowed.key?([status, event]) && !(status == 'pending_payment' && event == 'ship')

      it "invalid transition raises InvalidTransition for #{event} from #{status}" do
        expect { order_in(status).transition!(event) }.to raise_error(described_class::InvalidTransition)
        expect(described_class.find_by(account: account).status).to eq(status)
      end
    end

    it 'ship from pending_payment is allowed only for cod' do
      expect(order_in('pending_payment', method: 'cod').transition!(:ship).status).to eq('shipping')
      expect { order_in('pending_payment', method: 'transfer_qr').transition!(:ship) }.to raise_error(described_class::InvalidTransition)
    end

    it 'rejects unknown events' do
      expect { build_order.transition!(:explode) }.to raise_error(described_class::InvalidTransition)
    end

    allowed.each do |(status, event), target|
      next if status == 'pending_payment' && event == 'ship'

      it "#{event} moves #{status} to #{target}" do
        expect(order_in(status).transition!(event).status).to eq(target)
      end
    end
  end
end
