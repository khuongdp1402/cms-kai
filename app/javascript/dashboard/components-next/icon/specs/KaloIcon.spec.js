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

  it('sets the stroke defaults on the host svg because the sprite root style does not reach the symbols', () => {
    const classes = mount(KaloIcon, { props: { name: 'plus' } })
      .find('svg')
      .classes();
    expect(classes).toEqual(
      expect.arrayContaining(['fill-none', 'stroke-current', 'stroke-2'])
    );
  });

  it('puts the duotone fill inline on every accent element (a sprite <style> does not reach <use> instances)', () => {
    const sprite = readFileSync('public/kalo-icons.svg', 'utf8');
    const accents = [...sprite.matchAll(/<[a-z]+ [^>]*class="(a|w)"[^>]*>/g)];
    expect(accents.length).toBeGreaterThan(0);
    accents.forEach(([tag, cls]) => {
      const variable = cls === 'a' ? '--ia' : '--ibg';
      expect(tag).toMatch(
        new RegExp(`style="fill:var\\(${variable},#[0-9A-Fa-f]{3,6}\\)"`)
      );
    });
    expect(readFileSync('docs/design/kalo/brand/kalo-icons.svg', 'utf8')).toBe(
      sprite
    );
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
