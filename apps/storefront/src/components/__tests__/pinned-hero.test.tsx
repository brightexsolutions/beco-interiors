import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PinnedHero, type HeroRangeSlide } from '../pinned-hero';

/**
 * jsdom has no `IntersectionObserver`, and the component's own effect
 * no-ops without one, so `active` stays at its initial value, 0. That is
 * enough to prove the lede crossfade and its fallback are wired correctly:
 * the scroll driven index change itself is exercised by hand on a real
 * device per D23, not by an automated test.
 */
const slide = (over: Partial<HeroRangeSlide> & Pick<HeroRangeSlide, 'slug' | 'title'>): HeroRangeSlide => ({
  src: '/img/a.webp', alt: over.title, width: 1600, height: 1200,
  body: 'A range Beco stocks.', href: `/shop/${over.slug}`, ...over,
});

describe('PinnedHero, the lede', () => {
  it('shows the active slide’s own first sentence, not the whole body', () => {
    const { container } = render(
      <PinnedHero
        slides={[
          slide({
            slug: 'sintered-stone', title: 'Sintered stone',
            body: 'Large format slabs for worktops and vanities. Available in 12mm and 15mm.',
          }),
          slide({ slug: 'flooring', title: 'SPC flooring', body: 'A rigid core plank that clicks together without adhesive.' }),
        ]}
      />,
    );

    // Scoped to the visible crossfade layers, not the invisible sizer, which
    // duplicates whichever lede is longest on purpose to reserve the box's
    // height, and would otherwise make this same sentence match twice.
    const active = container.querySelector('p.absolute.inset-0[aria-hidden="false"]');
    // Trimmed to the first sentence only: copy is short, per the site's own
    // rule, and a hero lede is not where the full paragraph belongs.
    expect(active?.textContent).toBe('Large format slabs for worktops and vanities.');
    expect(active?.textContent).not.toContain('Available in 12mm and 15mm');
  });

  it('cuts a long sentence to a word boundary even when its first clause is too short to use', () => {
    // The real bug: a sentence whose first clause (before the first comma)
    // is under 24 characters fell through the clause heuristic entirely and
    // rendered in full on the mobile hero, crowding the screen with a
    // 122 character sentence under the headline.
    const { container } = render(
      <PinnedHero
        slides={[
          slide({
            slug: 'hardware', title: 'Hardware',
            body:
              'Handles, hinges and locks in finishes chosen to sit with the surfaces we supply, '
              + 'stocked alongside the ranges they finish.',
          }),
        ]}
      />,
    );
    // Single slide: the invisible sizer paragraph duplicates the real lede on
    // purpose (see the render-every-lede test below), so this scopes to the
    // one visible crossfade layer rather than matching both.
    const active = container.querySelector('p.absolute.inset-0[aria-hidden="false"]');
    expect(active?.textContent).toBeTruthy();
    expect(active!.textContent!.length).toBeLessThanOrEqual(72);
    expect(active?.textContent).not.toContain('stocked alongside the ranges they finish');
  });

  it('renders every lede in the document, so the crossfade has something to fade between', () => {
    // getAllByText, not getByText: the invisible sizer paragraph that
    // reserves the box's height duplicates whichever lede is longest, on
    // purpose, so a bare getByText fails on that one entirely honestly.
    const { container } = render(
      <PinnedHero
        slides={[
          slide({ slug: 'a', title: 'A', body: 'First range sentence.' }),
          slide({ slug: 'b', title: 'B', body: 'Second range sentence.' }),
          slide({ slug: 'c', title: 'C', body: 'Third range sentence.' }),
        ]}
      />,
    );
    const layers = [...container.querySelectorAll('p.absolute.inset-0')].map((el) => el.textContent);
    expect(layers).toEqual(['First range sentence.', 'Second range sentence.', 'Third range sentence.']);
  });

  it('keeps exactly one opacity value per lede layer, never two competing for it', () => {
    // The exact bug that froze RotatingStatement's photograph: a hardcoded
    // base opacity class alongside a conditional one. Checked directly here
    // since it is a real, previously shipped failure mode on this same
    // crossfade technique, not a hypothetical one.
    const { container } = render(
      <PinnedHero
        slides={[
          slide({ slug: 'a', title: 'A', body: 'First range sentence.' }),
          slide({ slug: 'b', title: 'B', body: 'Second range sentence.' }),
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

  it('never crashes on an empty slide list', () => {
    const { container } = render(<PinnedHero slides={[]} />);
    expect(container).toBeInTheDocument();
  });
});

/**
 * Per D79 and D92: the desktop hero is a full bleed, crossfading photograph,
 * now walking through every range rather than repeating stone. Same
 * crossfade technique RotatingStatement and StoneSlider already use, and
 * the same bug class this file already guards the lede against: opacity has
 * to have exactly one source per photograph layer.
 */
describe('PinnedHero, the full bleed photograph', () => {
  // The desktop crossfade wrapper is the FIRST .beco-ambient block in the
  // document: mobile's own single background photograph and every
  // RangeCard's frame also carry the class, so this scopes to the one this
  // describe block is actually about rather than matching all three.
  const desktopLayers = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.beco-ambient')[0]!.querySelectorAll('img'));

  it('renders one photograph layer per slide, the first fully opaque', () => {
    const { container } = render(
      <PinnedHero
        slides={[
          slide({ slug: 'a', title: 'A', src: '/a.webp' }),
          slide({ slug: 'b', title: 'B', src: '/b.webp' }),
          slide({ slug: 'c', title: 'C', src: '/c.webp' }),
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
      <PinnedHero slides={[slide({ slug: 'a', title: 'A' }), slide({ slug: 'b', title: 'B' })]} />,
    );
    for (const layer of desktopLayers(container)) {
      const opacityClasses = layer.className.split(' ').filter((c) => /^opacity-\d+$/.test(c));
      expect(opacityClasses).toHaveLength(1);
    }
  });

  it('the first photograph is never marked lazy, since it is the LCP element', () => {
    const { container } = render(
      <PinnedHero slides={[slide({ slug: 'a', title: 'A' })]} />,
    );
    // next/image drops the loading attribute entirely for a priority image
    // rather than setting it to "eager", so its absence IS the assertion.
    expect(desktopLayers(container)[0]).not.toHaveAttribute('loading', 'lazy');
  });
});

describe('PinnedHero, the right side range chips', () => {
  const SLIDES = [
    slide({ slug: 'sintered-stone', title: 'Sintered stone' }),
    slide({ slug: 'flooring', title: 'SPC flooring' }),
    slide({ slug: 'wall-panels', title: 'Wall panels' }),
  ];

  // The mobile swipeable row renders a RangeCard for every range too, a
  // real link to the same href with a longer accessible name built from its
  // own visible plate text. Exact string matches, not regex, is what tells
  // the chip's own short sr-only name apart from it: jsdom renders both
  // trees regardless of the lg: classes hiding one.
  const chip = (name: string) => screen.getByRole('link', { name });

  it('is a real link to each range, not a decorative control', () => {
    render(<PinnedHero slides={SLIDES} />);
    expect(chip('Sintered stone, showing now')).toHaveAttribute('href', '/shop/sintered-stone');
    expect(chip('SPC flooring')).toHaveAttribute('href', '/shop/flooring');
    expect(chip('Wall panels')).toHaveAttribute('href', '/shop/wall-panels');
  });

  it('renders a range with no stock as a plain span, never a link to a dead shop page', () => {
    render(
      <PinnedHero
        slides={[
          slide({ slug: 'sintered-stone', title: 'Sintered stone' }),
          slide({ slug: 'accessories', title: 'Accessories', href: null }),
        ]}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Accessories' })).toBeNull();
    expect(screen.getByText('Accessories', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('names which range is showing now for assistive technology, without misusing aria-current', () => {
    render(<PinnedHero slides={SLIDES} />);
    // Active stays at index 0 in jsdom, per this file's own top note: there
    // is no IntersectionObserver here to move it.
    expect(chip('Sintered stone, showing now')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'SPC flooring, showing now' })).toBeNull();
  });

  it('rings only the active chip, on its own overlay rather than the link', () => {
    // A separate span, not a class on the link itself, so the ring can
    // pulse on its own opacity without fighting the link's own scale
    // transition on the same element.
    render(<PinnedHero slides={SLIDES} />);
    expect(chip('Sintered stone, showing now').querySelector('.ring-high-vis-white')).not.toBeNull();
    expect(chip('SPC flooring').querySelector('.ring-high-vis-white')).toBeNull();
  });

  it('scales up only the active chip, via transform rather than a width change', () => {
    // A width change would reflow its neighbours in the column; scale
    // does not, per the site's own transform-and-opacity-only motion rule.
    render(<PinnedHero slides={SLIDES} />);
    expect(chip('Sintered stone, showing now').className.split(' ')).toContain('scale-110');
    expect(chip('SPC flooring').className.split(' ')).not.toContain('scale-110');
  });

  it('labels the active chip with a floating name, replayed on change', () => {
    render(<PinnedHero slides={SLIDES} />);
    expect(screen.getByText('Sintered stone', { selector: '.beco-chip-label' })).toBeInTheDocument();
    expect(screen.queryByText('SPC flooring', { selector: '.beco-chip-label' })).toBeNull();
  });
});
