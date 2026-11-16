require 'rails_helper'

RSpec.describe Kchat::VietQr do
  let(:payload) { described_class.payload(bin: '970436', account_number: '0011001234567', amount: 403_000, memo: 'Don 1042') }

  def crc16(data)
    data.each_byte.reduce(0xFFFF) do |crc, byte|
      crc ^= byte << 8
      8.times { crc = crc.anybits?(0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF }
      crc
    end
  end

  describe '.payload' do
    it 'starts with the static header and contains the fixed fields' do
      expect(payload).to start_with('000201010212')
      expect(payload).to include('5303704', '5802VN', '0010A000000727', '0208QRIBFTTA')
    end

    it 'builds the merchant account field from bin and account number' do
      expect(payload).to include('38570010A00000072701270006970436011300110012345670208QRIBFTTA')
    end

    it 'carries the exact amount in field 54' do
      expect(payload).to include('5406403000')
    end

    it 'ends with CRC16/CCITT-FALSE of everything before it' do
      body = payload[0...-4]
      expect(body).to end_with('6304')
      expect(payload[-4..]).to eq(format('%04X', crc16(body)))
    end

    it 'has well-formed TLV fields' do
      pos = 0
      ids = []
      while pos < payload.length
        ids << payload[pos, 2]
        pos += 4 + payload[pos + 2, 2].to_i
      end
      expect(pos).to eq(payload.length)
      expect(ids).to eq(%w[00 01 38 53 54 58 62 63])
    end
  end

  describe 'memo sanitising' do
    it 'turns accents, symbols and emoji into plain ASCII within 25 chars' do
      result = described_class.payload(bin: '970436', account_number: '1', amount: 1000, memo: 'Đơn #1042 áo thun 😀')
      expect(result).to include('0816Don 1042 ao thun6304')
      expect(result).not_to match(/[^\x20-\x7E]/)
    end

    it 'truncates the memo to 25 characters' do
      result = described_class.payload(bin: '970436', account_number: '1', amount: 1000, memo: 'a' * 60)
      expect(result).to include("0825#{'a' * 25}6304")
    end
  end

  describe 'guards' do
    let(:args) { { bin: '970436', account_number: '1', amount: 1000, memo: 'x' } }

    it 'omits tag 62 when the sanitized memo is empty' do
      result = described_class.payload(**args, memo: '😀 #')
      expect(result).not_to include('62040800')
      expect(result).to end_with("5802VN6304#{result[-4..]}")
      expect(described_class.payload(**args, memo: '')).not_to include('6204')
    end

    it 'rejects non-positive amounts' do
      [0, -1].each { |amount| expect { described_class.payload(**args, amount: amount) }.to raise_error(ArgumentError) }
    end

    it 'rejects field values longer than 99 characters' do
      expect { described_class.payload(**args, account_number: '1' * 100) }.to raise_error(ArgumentError)
    end
  end

  describe '.png' do
    it 'returns binary PNG data' do
      expect(described_class.png(payload).b).to start_with("\x89PNG".b)
    end
  end
end
