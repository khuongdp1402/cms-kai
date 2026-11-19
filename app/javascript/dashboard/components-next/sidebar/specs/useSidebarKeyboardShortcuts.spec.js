// Characterization spec (chat-parity C-94, C-95).
// Pins components-next/sidebar/useSidebarKeyboardShortcuts.js:18-35.
import { useSidebarKeyboardShortcuts } from '../useSidebarKeyboardShortcuts';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

const mockPush = vi.fn();
let mockRouteName = 'somewhere';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
// Kalo: Alt+R opens the detailed reports only when kalo_detailed_reports is on.
let mockDetailedReports = true;
vi.mock('dashboard/composables/useKaloFeatures', () => ({
  useKaloFeatures: () => ({ isRouteNameOn: () => mockDetailedReports }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: mockRouteName }),
  useRouter: () => ({ push: mockPush }),
}));

describe('useSidebarKeyboardShortcuts', () => {
  let events;
  const toggle = vi.fn();

  beforeEach(() => {
    mockRouteName = 'somewhere';
    mockDetailedReports = true;
    useKeyboardEvents.mockClear();
    useSidebarKeyboardShortcuts(toggle);
    events = useKeyboardEvents.mock.calls[0][0];
  });

  it('registers exactly the documented shortcuts', () => {
    expect(Object.keys(events).sort()).toEqual(
      [
        '$mod+Escape',
        '$mod+Slash',
        'Alt+KeyC',
        'Alt+KeyR',
        'Alt+KeyS',
        'Alt+KeyV',
      ].sort()
    );
  });

  it('Cmd+/ opens and Cmd+Esc closes the shortcut modal', () => {
    events['$mod+Slash'].action();
    expect(toggle).toHaveBeenLastCalledWith(true);
    events['$mod+Escape'].action();
    expect(toggle).toHaveBeenLastCalledWith(false);
  });

  it.each([
    ['Alt+KeyC', 'home'],
    ['Alt+KeyV', 'contacts_dashboard_index'],
    ['Alt+KeyR', 'account_overview_reports'],
    ['Alt+KeyS', 'agent_list'],
  ])('%s navigates to route %s', (key, name) => {
    events[key].action();
    expect(mockPush).toHaveBeenCalledWith({ name });
  });

  it('Alt+KeyR opens the Kalo reports page when detailed reports are off', () => {
    mockDetailedReports = false;
    events['Alt+KeyR'].action();
    expect(mockPush).toHaveBeenLastCalledWith({ name: 'kalo_reports' });
  });

  it('does not navigate when already on the target route', () => {
    mockRouteName = 'home';
    useSidebarKeyboardShortcuts(toggle);
    useKeyboardEvents.mock.calls[1][0]['Alt+KeyC'].action();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
