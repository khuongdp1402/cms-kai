import { ref, watch } from 'vue';
import wootConstants from 'dashboard/constants/globals';

const { ME, UNASSIGNED } = wootConstants.ASSIGNEE_TYPE;

/**
 * A new shop's first customer message lands in "Chưa ai nhận" while the list
 * opens on "Của tôi" (empty). On the first counts loaded, open "Chưa ai nhận"
 * instead when "Của tôi" has nothing and "Chưa ai nhận" has something. Never
 * once decided, never after the person picked a tab (click or Alt+N), and only
 * on the plain list (no filter or folder), where those counts describe what
 * the tabs show.
 */
export const shouldOpenUnassigned = ({
  activeTab,
  hasUserPicked,
  hasDecided,
  isFiltered,
  tabKeys,
  stats,
}) => {
  if (hasUserPicked || hasDecided || isFiltered) return false;
  if (activeTab !== ME || !tabKeys.includes(UNASSIGNED)) return false;
  if (!stats || stats.mineCount === undefined) return false;
  return stats.mineCount === 0 && (stats.unAssignedCount || 0) > 0;
};

/**
 * Watches the conversation counts and decides the default tab once, on the
 * first counts loaded after the list mounted (`updatedOn` changes; counts
 * already in the store may describe another list). Switch or not, it is never
 * re-evaluated, so closing the last own chat or changing the status filter
 * later does not jump tabs. Refs/getters in, `openUnassigned()` out.
 */
export const useDefaultAssigneeTab = ({
  stats,
  activeTab,
  hasUserPicked,
  isFiltered,
  tabKeys,
  openUnassigned,
}) => {
  const seenAtMount = stats.value?.updatedOn;
  const isDecided = ref(false);
  watch(
    () => stats.value?.updatedOn,
    updatedOn => {
      if (isDecided.value || !updatedOn || updatedOn === seenAtMount) return;
      isDecided.value = true;
      const open = shouldOpenUnassigned({
        activeTab: activeTab.value,
        hasUserPicked: hasUserPicked.value,
        hasDecided: false,
        isFiltered: isFiltered.value,
        tabKeys: tabKeys.value,
        stats: stats.value,
      });
      if (open) openUnassigned();
    }
  );
  return { isDecided };
};
