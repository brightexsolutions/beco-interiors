import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PinnedHero, type HeroSlab } from '../pinned-hero';

/**
 * jsdom has no `IntersectionObserver`, and the component's own effect
 * no-ops without one, so `active` stays at its initial value, 0. That is
 * enough to prove the lede crossfade and its fallback are wired correctly:
 * the scroll driven index change itself is exercised by hand on a real
 * device per D23, not by an automated test.
 */
const slab = (over: Partial<HeroSlab> & Pick<HeroSlab, 'slug' | 'name'>): HeroSlab => ({
  category: 'Sintered stone', src: '/img/a.webp', alt: over.name,
  width: 1600, height: 1200, ...over,
});

describe('PinnedHero, the lede', () => {
  it('shows the active slab’s own first sentence, not a generic one', () => {
    const { container } = render(
      <PinnedHero
        thickness="12mm"
        slabs={[
          slab({
            slug: 'amber-jade', name: 'Amber Jade',
            blurb: 'Warm taupe and amber tones run in soft vertical layers. It is quarried in Italy.',
          }),
          slab({ slug: 'beverly-gold', name: 'Beverly Gold', blurb: 'A soft off white background.' }),
        ]}
      />,
    );

    // Scoped to the visible crossfade layers, not the invisible sizer, which
    // duplicates whichever lede is longest on purpose to reserve the box's
    // height, and would otherwise make this same sentence match twice.
    const active = container.querySelector('p.absolute.inset-0[aria-hidden="false"]');
    // Trimmed to the first sentence only: copy is short, per the site's own
    // rule, and a hero lede is not where the full paragraph belongs.
    expect(active?.textContent).toBe('Warm taupe and amber tones run in soft vertical layers.');
    expect(active?.textContent).not.toContain('It is quarried in Italy');
  });

  it('falls back to the generic sentence for a slab with no description yet', () => {
    render(
      <PinnedHero
        thickness="12mm"
        slabs={[slab({ slug: 'cyprus-grey', name: 'Cyprus Grey', blurb: null })]}
      />,
    );
    // getAllByText: with a single slab the fallback appears twice, once in
    // the invisible sizer and once in the one real crossfade layer, both
    // showing the same fallback text since there is nothing else to differ
    // from.
    expect(screen.getAllByText(/Large format slabs for kitchens/).length).toBeGreaterThan(0);
  });

  it('renders every lede in the document, so the crossfade has something to fade between', () => {
    // getAllByText, not getByText: the invisible sizer paragraph that
    // reserves the box's height duplicates whichever lede is longest, on
    // purpose, so a bare getByText fails on that one entirely honestly.
    const { container } = render(
      <PinnedHero
        thickness="12mm"
        slabs={[
          slab({ slug: 'a', name: 'A', blurb: 'First stone sentence.' }),
          slab({ slug: 'b', name: 'B', blurb: 'Second stone sentence.' }),
          slab({ slug: 'c', name: 'C', blurb: 'Third stone sentence.' }),
        ]}
      />,
    );
    const layers = [...container.querySelectorAll('p.absolute.inset-0')].map((el) => el.textContent);
    expect(layers).toEqual(['First stone sentence.', 'Second stone sentence.', 'Third stone sentence.']);
  });

  it('keeps exactly one opacity value per lede layer, never two competing for it', () => {
    // The exact bug that froze RotatingStatement's photograph: a hardcoded
    // base opacity class alongside a conditional one. Checked directly here
    // since it is a real, previously shipped failure mode on this same
    // crossfade technique, not a hypothetical one.
    const { container } = render(
      <PinnedHero
        thickness="12mm"
        slabs={[
          slab({ slug: 'a', name: 'A', blurb: 'First stone sentence.' }),
          slab({ slug: 'b', name: 'B', blurb: 'Second stone sentence.' }),
        ]}
      />,
    );
    const layers = [...container.querySelectorAll('p.absolute.inset-0')];
    expect(layers).toHaveLength(2);
    expect(layers[0]).toHaveClass('opacity-100');
    expect(layers[0]).not.toHaveClass('opacity-0');
    expect(layers[1]).toHaveClass('opacity-0');
    expect(layers[1]).not.toHaveClass('opacity-100');
  });

  it('never crashes on an empty slab list', () => {
    const { container } = render(<PinnedHero thickness="12mm" slabs={[]} />);
    expect(container).toBeInTheDocument();
  });
});

/**
 * Per D79: the desktop hero went back to a full bleed, crossfading
 * photograph, married with the rest of the current hero rather than a
 * plain revert. Same crossfade technique RotatingStatement and StoneSlider
 * already use, and the same bug class this file already guards the lede
 * against: opacity has to have exactly one source per photograph layer.
 */
describe('PinnedHero, the full bleed photograph', () => {
  // The desktop crossfade wrapper is the FIRST .beco-ambient block in the
  // document: mobile's own single background photograph and every
  // SlabCard's frame also carry the class, so this scopes to the one this
  // describe block is actually about rather than matching all three.
  const desktopLayers = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.beco-ambient')[0]!.querySelectorAll('img'));

  it('renders one photograph layer per slab, the first fully opaque', () => {
    const { container } = render(
      <PinnedHero
        thickness="12mm"
        slabs={[
          slab({ slug: 'a', name: 'A', src: '/a.webp' }),
          slab({ slug: 'b', name: 'B', src: '/b.webp' }),
          slab({ slug: 'c', name: 'C', src: '/c.webp' }),
        ]}
      />,
    );
    const layers = desktopLayers(container);
    expect(layers).toHaveLength(3);
    expect(layers[0]).toHaveClass('opacity-100');
    expect(layers[0]).not.toHaveClass('opacity-0');
    expect(layers[1]).toHaveClass('opacity-0');
    expect(layers[1]).not.toHaveClass('opacity-100');
  });

  it('never renders two opacity values on the same photograph layer', () => {
    const { container } = render(
      <PinnedHero
        thickness="12mm"
        slabs={[slab({ slug: 'a', name: 'A' }), slab({ slug: 'b', name: 'B' })]}
      />,
    );
    for (const layer of desktopLayers(container)) {
      const opacityClasses = layer.className.split(' ').filter((c) => /^opacity-\d+$/.test(c));
      expect(opacityClasses).toHaveLength(1);
    }
  });

  it('the first photograph is never marked lazy, since it is the LCP element', () => {
    const { container } = render(
      <PinnedHero thickness="12mm" slabs={[slab({ slug: 'a', name: 'A' })]} />,
    );
    // next/image drops the loading attribute entirely for a priority image
    // rather than setting it to "eager", so its absence IS the assertion.
    expect(desktopLayers(container)[0]).not.toHaveAttribute('loading', 'lazy');
  });
});
