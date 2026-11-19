import wootConstants from 'dashboard/constants/globals';

const { ME, UNASSIGNED } = wootConstants.ASSIGNEE_TYPE;

/**
 * A new shop's first customer message lands in "Chưa ai nhận" while the list
 * opens on "Của tôi" (empty). On first load only, open "Chưa ai nhận" instead
 * when "Của tôi" has nothing and "Chưa ai nhận" has something. Never after the
 * person picked a tab (click or Alt+N), and only on the plain list (no filter
 * or folder), where those counts describe what the tabs show.
 */
export const shouldOpenUnassigned = ({
  activeTab,
  hasUserPicked,
  hasAutoSwitched,
  isFiltered,
  tabKeys,
  stats,
}) => {
  if (hasUserPicked || hasAutoSwitched || isFiltered) return false;
  if (activeTab !== ME || !tabKeys.includes(UNASSIGNED)) return false;
  if (!stats || stats.mineCount === undefined) return false;
  return stats.mineCount === 0 && (stats.unAssignedCount || 0) > 0;
};
