// Major Vietnamese banks with their NAPAS BIN, the 6-digit id Kchat::VietQr
// puts in the VietQR payload (field 38/01/00). Source: the public NAPAS/VietQR
// bank list; 970436 (Vietcombank) and 970422 (MB) are also used by the backend
// specs. A bank that is missing here is entered by hand as OTHER_BANK.
export const VN_BANKS = [
  { bin: '970436', code: 'VCB', shortName: 'Vietcombank' },
  { bin: '970415', code: 'ICB', shortName: 'VietinBank' },
  { bin: '970418', code: 'BIDV', shortName: 'BIDV' },
  { bin: '970405', code: 'VBA', shortName: 'Agribank' },
  { bin: '970407', code: 'TCB', shortName: 'Techcombank' },
  { bin: '970422', code: 'MB', shortName: 'MB Bank' },
  { bin: '970416', code: 'ACB', shortName: 'ACB' },
  { bin: '970432', code: 'VPB', shortName: 'VPBank' },
  { bin: '970423', code: 'TPB', shortName: 'TPBank' },
  { bin: '970403', code: 'STB', shortName: 'Sacombank' },
  { bin: '970437', code: 'HDB', shortName: 'HDBank' },
  { bin: '970441', code: 'VIB', shortName: 'VIB' },
  { bin: '970443', code: 'SHB', shortName: 'SHB' },
  { bin: '970431', code: 'EIB', shortName: 'Eximbank' },
  { bin: '970426', code: 'MSB', shortName: 'MSB' },
  { bin: '970440', code: 'SEAB', shortName: 'SeABank' },
  { bin: '970448', code: 'OCB', shortName: 'OCB' },
  { bin: '970449', code: 'LPB', shortName: 'LPBank' },
  { bin: '970428', code: 'NAB', shortName: 'Nam A Bank' },
  { bin: '970409', code: 'BAB', shortName: 'Bac A Bank' },
  { bin: '970425', code: 'ABB', shortName: 'ABBANK' },
  { bin: '970454', code: 'VCCB', shortName: 'BVBank' },
  { bin: '970412', code: 'PVCB', shortName: 'PVcomBank' },
  { bin: '970452', code: 'KLB', shortName: 'KienlongBank' },
  { bin: '970429', code: 'SCB', shortName: 'SCB' },
  { bin: '970400', code: 'SGICB', shortName: 'Saigonbank' },
  { bin: '970419', code: 'NCB', shortName: 'NCB' },
  { bin: '970430', code: 'PGB', shortName: 'PGBank' },
  { bin: '970427', code: 'VAB', shortName: 'VietABank' },
  { bin: '970433', code: 'VIETBANK', shortName: 'Vietbank' },
  { bin: '970438', code: 'BVB', shortName: 'BaoViet Bank' },
  { bin: '970424', code: 'SHBVN', shortName: 'Shinhan Bank' },
];

export const OTHER_BANK = 'other';

export const findBank = bin => VN_BANKS.find(bank => bank.bin === bin);
