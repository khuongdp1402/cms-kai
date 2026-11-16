// Integer VND, dot-grouped: 403000 -> "403.000đ".
export const formatMoney = amount =>
  `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

export const formatDate = iso => {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const formatTime = iso => {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${formatDate(iso)}`;
};
