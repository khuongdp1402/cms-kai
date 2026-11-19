import { nextTick, ref } from 'vue';
import {
  shouldOpenUnassigned,
  useDefaultAssigneeTab,
} from '../kaloAssigneeTab';

const base = {
  activeTab: 'me',
  hasUserPicked: false,
  hasDecided: false,
  isFiltered: false,
  tabKeys: ['me', 'unassigned', 'all'],
  stats: { mineCount: 0, unAssignedCount: 1, allCount: 1 },
};

describe('shouldOpenUnassigned', () => {
  it('opens "Chưa ai nhận" when "Của tôi" is empty and someone is waiting', () => {
    expect(shouldOpenUnassigned(base)).toBe(true);
  });

  it.each([
    ['the person already picked a tab', { hasUserPicked: true }],
    ['the default tab was already decided', { hasDecided: true }],
    ['a filter or folder is applied', { isFiltered: true }],
    ['another tab is open', { activeTab: 'all' }],
    ['the role cannot see unassigned chats', { tabKeys: ['me'] }],
    ['"Của tôi" has chats', { stats: { mineCount: 2, unAssignedCount: 1 } }],
    ['nobody is waiting', { stats: { mineCount: 0, unAssignedCount: 0 } }],
    ['the counts are not loaded', { stats: {} }],
  ])('stays put when %s', (_, change) => {
    expect(shouldOpenUnassigned({ ...base, ...change })).toBe(false);
  });
});

describe('useDefaultAssigneeTab', () => {
  const setup = (initialStats = {}) => {
    const stats = ref(initialStats);
    const activeTab = ref('me');
    const hasUserPicked = ref(false);
    const openUnassigned = vi.fn(() => {
      activeTab.value = 'unassigned';
    });
    const { isDecided } = useDefaultAssigneeTab({
      stats,
      activeTab,
      hasUserPicked,
      isFiltered: ref(false),
      tabKeys: ref(['me', 'unassigned', 'all']),
      openUnassigned,
    });
    const load = async counts => {
      stats.value = { ...counts, updatedOn: new Date() };
      await nextTick();
    };
    return { stats, hasUserPicked, openUnassigned, isDecided, load };
  };

  it('switches on the first counts loaded after mount', async () => {
    const env = setup();
    await env.load({ mineCount: 0, unAssignedCount: 1 });
    expect(env.openUnassigned).toHaveBeenCalledTimes(1);
    expect(env.isDecided.value).toBe(true);
  });

  it('decides once: no jump when "Của tôi" empties later', async () => {
    const env = setup();
    await env.load({ mineCount: 2, unAssignedCount: 1 });
    expect(env.isDecided.value).toBe(true);
    // Last own chat resolved, or another status filter: the counts change.
    await env.load({ mineCount: 0, unAssignedCount: 3 });
    expect(env.openUnassigned).not.toHaveBeenCalled();
  });

  it('ignores counts already in the store at mount', async () => {
    const stale = { mineCount: 0, unAssignedCount: 5, updatedOn: new Date() };
    const env = setup(stale);
    env.stats.value = { ...stale };
    await nextTick();
    expect(env.openUnassigned).not.toHaveBeenCalled();
    expect(env.isDecided.value).toBe(false);
  });

  it('respects a tab the person picked before the counts arrived', async () => {
    const env = setup();
    env.hasUserPicked.value = true;
    await env.load({ mineCount: 0, unAssignedCount: 1 });
    expect(env.openUnassigned).not.toHaveBeenCalled();
    expect(env.isDecided.value).toBe(true);
  });
});
