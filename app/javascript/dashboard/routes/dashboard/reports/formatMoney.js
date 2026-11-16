// Whole VND with dot separators, e.g. 403000 -> "403.000đ".
// Task 8 ships its own formatVnd; unify the two later.
export const formatMoney = amount =>
  `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
