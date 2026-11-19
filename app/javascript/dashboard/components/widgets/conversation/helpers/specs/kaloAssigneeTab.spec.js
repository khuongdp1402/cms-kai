import { shouldOpenUnassigned } from '../kaloAssigneeTab';

const base = {
  activeTab: 'me',
  hasUserPicked: false,
  hasAutoSwitched: false,
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
    ['it already switched once', { hasAutoSwitched: true }],
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
