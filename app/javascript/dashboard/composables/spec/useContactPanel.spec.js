// Task 6 (5c): on small screens the contact panel must not cover a newly
// opened conversation just because it was left open on desktop, and opening
// or closing it there must not change the persisted desktop preference.
import { ref } from 'vue';

const uiSettings = ref({});
const updateUISettings = vi.fn();
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings, updateUISettings }),
}));

const setWidth = width => {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
};

// Fresh module state (the small-screen "opened for" id) for every test.
const loadComposable = async () => {
  vi.resetModules();
  const { useContactPanel } = await import('../useContactPanel');
  return useContactPanel();
};

describe('useContactPanel', () => {
  beforeEach(() => {
    updateUISettings.mockClear();
    uiSettings.value = { is_contact_sidebar_open: true };
  });
  afterAll(() => setWidth(1024));

  describe('on desktop', () => {
    beforeEach(() => setWidth(1280));

    it('follows the persisted preference', async () => {
      const panel = await loadComposable();
      expect(panel.isContactPanelOpenFor(7)).toBe(true);
      uiSettings.value = { is_contact_sidebar_open: false };
      expect(panel.isContactPanelOpenFor(7)).toBe(false);
    });

    it('opening and closing persist the preference', async () => {
      const panel = await loadComposable();
      panel.closeContactPanel();
      expect(updateUISettings).toHaveBeenLastCalledWith({
        is_contact_sidebar_open: false,
        is_copilot_panel_open: false,
      });
      panel.openContactPanel(7);
      expect(updateUISettings).toHaveBeenLastCalledWith({
        is_contact_sidebar_open: true,
        is_copilot_panel_open: false,
      });
    });
  });

  describe('on a small screen (400px)', () => {
    beforeEach(() => setWidth(400));

    it('starts collapsed even when the desktop preference is open', async () => {
      const panel = await loadComposable();
      expect(panel.isSmallScreen.value).toBe(true);
      expect(panel.isContactPanelOpenFor(7)).toBe(false);
    });

    it('opens only for the conversation it was opened from, without saving', async () => {
      const panel = await loadComposable();
      panel.openContactPanel(7);
      expect(panel.isContactPanelOpenFor(7)).toBe(true);
      expect(panel.isContactPanelOpenFor(8)).toBe(false);
      panel.toggleContactPanel(7);
      expect(panel.isContactPanelOpenFor(7)).toBe(false);
      expect(updateUISettings).not.toHaveBeenCalled();
    });
  });
});
