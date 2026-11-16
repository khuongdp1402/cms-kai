import viMessages from 'dashboard/i18n/ktech/vi.json';
import { kchatErrorKey } from '../kchatErrors';

const lookup = key =>
  key.split('.').reduce((node, part) => node?.[part], viMessages);
const fail = code => ({ response: { data: { error: code } } });

describe('kchatErrorKey', () => {
  it.each([
    ['insufficient_stock', 'Không đủ hàng'],
    ['invalid_transition', 'Đơn này không chuyển bước được nữa'],
    ['payment_settings_missing', 'Chưa cài đặt tài khoản nhận tiền'],
    ['invalid_amount', 'Đơn 0đ không có mã QR'],
    ['order_not_payable', 'Đơn này không còn chờ thanh toán'],
    [
      'conversation_contact_mismatch',
      'Cuộc trò chuyện này không thuộc khách của đơn',
    ],
    ['subscription_expired', 'Gói dùng thử đã hết hạn'],
    ['validation_failed', 'Thông tin chưa đúng, hãy kiểm tra lại'],
  ])('maps %s to its Vietnamese message', (code, message) => {
    expect(lookup(kchatErrorKey(fail(code)))).toBe(message);
  });

  it('falls back to the generic message for unknown or missing codes', () => {
    expect(lookup(kchatErrorKey(fail('boom')))).toBe(
      'Có lỗi xảy ra, thử lại sau'
    );
    expect(lookup(kchatErrorKey(new Error('network')))).toBe(
      'Có lỗi xảy ra, thử lại sau'
    );
  });
});
