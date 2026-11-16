import { readFileSync } from 'node:fs';
import { mount } from '@vue/test-utils';
import KaloIcon from '../KaloIcon.vue';
import { KALO_ICON_NAMES } from '../kaloIconNames';

describe('KaloIcon', () => {
  it('mounts KaloIcon with name qr and renders use href "/kalo-icons.svg#i-qr"', () => {
    const wrapper = mount(KaloIcon, {
      props: { name: 'qr' },
      attrs: { class: 'size-6' },
    });
    expect(wrapper.find('svg').classes()).toContain('size-6');
    expect(wrapper.find('use').attributes('href')).toBe('/kalo-icons.svg#i-qr');
  });

  it('throws a clear error for an unknown name', () => {
    expect(() => mount(KaloIcon, { props: { name: 'nope' } })).toThrow(
      'Unknown KaloIcon name: nope'
    );
  });

  it('lists exactly the symbols of the sprite', () => {
    const sprite = readFileSync('public/kalo-icons.svg', 'utf8');
    const ids = [...sprite.matchAll(/<symbol id="i-([^"]+)"/g)].map(m => m[1]);
    expect([...KALO_ICON_NAMES].sort()).toEqual(ids.sort());
  });
});
