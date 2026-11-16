module Kchat::VietQr
  GUID = 'A000000727'.freeze
  SERVICE_CODE = 'QRIBFTTA'.freeze
  MEMO_LIMIT = 25

  module_function

  def payload(bin:, account_number:, amount:, memo:)
    beneficiary = field('00', bin) + field('01', account_number)
    merchant = field('00', GUID) + field('01', beneficiary) + field('02', SERVICE_CODE)
    body = [field('00', '01'), field('01', '12'), field('38', merchant), field('53', '704'), field('54', Integer(amount).to_s),
            field('58', 'VN'), field('62', field('08', sanitize_memo(memo))), '6304'].join
    format('%<body>s%<crc>04X', body: body, crc: crc16(body))
  end

  def png(payload)
    RQRCode::QRCode.new(payload, level: :m).as_png(size: 480, border_modules: 4).to_s
  end

  def sanitize_memo(memo)
    memo.to_s.unicode_normalize(:nfd).gsub(/\p{Mn}/, '').tr('đĐ', 'dD')
        .gsub(/[^A-Za-z0-9 ]/, '').squeeze(' ').strip[0, MEMO_LIMIT].strip
  end

  def field(id, value)
    format('%<id>s%<len>02d%<value>s', id: id, len: value.length, value: value)
  end

  def crc16(data)
    data.each_byte.reduce(0xFFFF) do |crc, byte|
      crc ^= byte << 8
      8.times { crc = crc.anybits?(0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF }
      crc
    end
  end
end
