import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { routeLocationKey, routerKey } from 'vue-router';
import { useOneShotQueryFlag } from '../useOneShotQueryFlag';

const run = ({ query, router }) => {
  let result;
  const provide = { [routeLocationKey]: { query } };
  if (router) provide[routerKey] = router;
  mount(
    defineComponent({
      setup() {
        result = useOneShotQueryFlag('new');
        return () => h('div');
      },
    }),
    { global: { provide } }
  );
  return result;
};

describe('useOneShotQueryFlag', () => {
  it('reports ?new=1 and drops only that key from the URL', () => {
    const router = { replace: vi.fn() };
    expect(run({ query: { new: '1', tab: 'paid' }, router })).toBe(true);
    expect(router.replace).toHaveBeenCalledWith({ query: { tab: 'paid' } });
  });

  it('leaves the URL alone when the flag is absent', () => {
    const router = { replace: vi.fn() };
    expect(run({ query: { tab: 'paid' }, router })).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('works without a router', () => {
    expect(run({ query: { new: '1' } })).toBe(true);
  });
});
