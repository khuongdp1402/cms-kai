// Kalo contact panel order: the shop-relevant sections first, everything else below a
// "Xem thêm" divider. The divider is a pseudo item stored in the same
// `conversation_sidebar_items_order` UI setting, so dragging a section across it
// (C-79) persists whether that section shows up front or under "Xem thêm".
export const KALO_MORE_DIVIDER = 'kalo_more';
export const KALO_LABELS_SECTION = 'conversation_labels';

// Shown above the divider, in this order, until the user reorders the panel.
export const KALO_PRIMARY_SECTIONS = [
  KALO_LABELS_SECTION,
  'contact_notes',
  'conversation_actions',
  'contact_attributes',
];

/**
 * @param {Array<{name: string}>} savedOrder - conversationSidebarItemsOrder (defaults merged in)
 * @returns {Array<{name: string}>} order with the labels section and the divider present
 */
export const buildKaloSidebarOrder = (savedOrder = []) => {
  const names = savedOrder.map(item => item.name);

  if (names.includes(KALO_MORE_DIVIDER)) {
    // Already arranged by Kalo; only add sections that did not exist at that time.
    const order = savedOrder.map(item => ({ name: item.name }));
    if (!names.includes(KALO_LABELS_SECTION)) {
      order.unshift({ name: KALO_LABELS_SECTION });
    }
    return order;
  }

  const rest = names.filter(name => !KALO_PRIMARY_SECTIONS.includes(name));
  return [...KALO_PRIMARY_SECTIONS, KALO_MORE_DIVIDER, ...rest].map(name => ({
    name,
  }));
};
