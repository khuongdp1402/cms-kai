export const formatVnd = amount => {
  const value = Math.round(Number(amount) || 0);
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
};

export default formatVnd;
