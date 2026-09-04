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
