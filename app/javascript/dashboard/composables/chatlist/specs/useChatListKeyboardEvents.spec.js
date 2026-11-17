// Characterization spec (chat-parity C-10).
// Pins composables/chatlist/useChatListKeyboardEvents.js:5-11,49-56: Alt+J = previous,
// Alt+K = next, and the DOM contract `div.conversations-list div.conversation` / `.active`.
import { ref } from 'vue';
import { useChatListKeyboardEvents } from '../useChatListKeyboardEvents';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

const buildList = activeIndex => {
  const root = document.createElement('div');
  const items = [0, 1, 2].map(i => {
    const cls = i === activeIndex ? 'conversation active' : 'conversation';
    return `<div class="${cls}"></div>`;
  });
  root.innerHTML = `<div class="conversations-list">${items.join('')}</div>`;
  const clicks = [];
  [...root.querySelectorAll('div.conversation')].forEach((el, i) =>
    el.addEventListener('click', () => clicks.push(i))
  );
  return { root, clicks };
};

const setup = activeIndex => {
  const { root, clicks } = buildList(activeIndex);
  useChatListKeyboardEvents(ref(root));
  const events = useKeyboardEvents.mock.calls[0][0];
  return { events, clicks };
};

describe('useChatListKeyboardEvents', () => {
  it('registers Alt+J and Alt+K that work while an input is focused', () => {
    const { events } = setup(1);
    expect(Object.keys(events).sort()).toEqual(['Alt+KeyJ', 'Alt+KeyK']);
    expect(events['Alt+KeyJ'].allowOnFocusedInput).toBe(true);
    expect(events['Alt+KeyK'].allowOnFocusedInput).toBe(true);
  });

  it('Alt+K clicks the conversation after the .active one', () => {
    const { events, clicks } = setup(0);
    events['Alt+KeyK'].action();
    expect(clicks).toEqual([1]);
  });

  it('Alt+J clicks the conversation before the .active one', () => {
    const { events, clicks } = setup(2);
    events['Alt+KeyJ'].action();
    expect(clicks).toEqual([1]);
  });

  it('Alt+K on the last conversation falls back to the last one', () => {
    const { events, clicks } = setup(2);
    events['Alt+KeyK'].action();
    expect(clicks).toEqual([2]);
  });

  it('Alt+J on the first conversation falls back to the first one', () => {
    const { events, clicks } = setup(0);
    events['Alt+KeyJ'].action();
    expect(clicks).toEqual([0]);
  });

  it('with no .active conversation Alt+K opens the first one', () => {
    const { events, clicks } = setup(-1);
    events['Alt+KeyK'].action();
    expect(clicks).toEqual([0]);
  });

  it('ignores conversations outside div.conversations-list', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="conversation"></div>';
    const spy = vi.fn();
    root.querySelector('.conversation').addEventListener('click', spy);
    useChatListKeyboardEvents(ref(root));
    const events = useKeyboardEvents.mock.calls[0][0];
    events['Alt+KeyK'].action();
    expect(spy).not.toHaveBeenCalled();
  });
});
