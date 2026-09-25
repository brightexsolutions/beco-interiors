import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProductGallery, orderImages, type GalleryImage } from '../product-gallery';

const img = (role: GalleryImage['role']): GalleryImage => ({
  role, alt: role, node: <div data-testid={role} />,
});

describe('orderImages', () => {
  it('orders by role, the way a specifier reads a material', () => {
    const out = orderImages([img('application'), img('slab'), img('bookmatch'), img('on_stand')]);
    expect(out.map((i) => i.role)).toEqual(['slab', 'on_stand', 'bookmatch', 'application']);
  });

  it('puts unknown last rather than dropping it', () => {
    const out = orderImages([img('unknown'), img('slab')]);
    expect(out.map((i) => i.role)).toEqual(['slab', 'unknown']);
  });
});

describe('ProductGallery', () => {
  it('reads correctly on THREE images, which a fifth of the catalogue has', () => {
    // Pure White has exactly this: a slab and two applications, no on-stand.
    render(<ProductGallery images={[img('slab'), img('application'), img('application')]} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('Full slab')).toBeDefined();
  });

  it('reads correctly on six', () => {
    render(<ProductGallery images={[
      img('slab'), img('on_stand'), img('bookmatch'),
      img('application'), img('application'), img('application'),
    ]} />);
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });

  it('shows no thumbnail strip for a single image', () => {
    render(<ProductGallery images={[img('slab')]} />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('renders a page rather than a hole when there are no photographs at all', () => {
    render(<ProductGallery images={[]} />);
    expect(screen.getByRole('img', { name: /no photograph/i })).toBeDefined();
  });

  it('names bookmatching, since most buyers will not know the word', () => {
    render(<ProductGallery images={[img('bookmatch')]} />);
    expect(screen.getByText('Bookmatched pair')).toBeDefined();
  });

  it('labels each thumbnail with its position for screen readers', () => {
    render(<ProductGallery images={[img('slab'), img('application')]} />);
    expect(screen.getByLabelText('Full slab, photograph 1 of 2')).toBeDefined();
  });
});

/**
 * The fan was built for stones, which carry three to six photographs. HEIC
 * decoding then brought in the hardware range at nineteen to thirty six, and
 * thirty three overlapping cards is 1600px of strip, which ran off the side of
 * the page past the frame and past the viewport.
 */
describe('ProductGallery, at hardware density', () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      role: 'unknown' as const,
      alt: `Photo ${i + 1}`,
      node: <span data-testid={`frame-${i}`} />,
    }));

  it('keeps the strip inside its own scroller rather than letting it overflow', () => {
    const { container } = render(<ProductGallery images={many(33)} />);
    const strip = container.querySelector('[role="tablist"]')!;

    // The bug was the absence of both of these: a flex row with no width
    // constraint and no scroller simply runs off the page.
    expect(strip.className).toContain('max-w-full');
    expect(strip.className).toContain('overflow-x-auto');
  });

  it('drops the fan when there are too many cards to choose between', () => {
    const { container } = render(<ProductGallery images={many(33)} />);
    const first = container.querySelector('[role="tab"]') as HTMLElement;
    // No rotation: thirty three angled cards is a stack, not a hand.
    expect(first.style.transform).toBe('');
  });

  it('keeps the fan for a handful, which is the signature treatment', () => {
    const { container } = render(<ProductGallery images={many(5)} />);
    const first = container.querySelector('[role="tab"]') as HTMLElement;
    expect(first.style.transform).toContain('rotate');
  });

  it('says how many there are, so nobody has to discover thirty more by accident', () => {
    render(<ProductGallery images={many(33)} />);
    expect(screen.getByText(/33 photographs, scroll for the rest/)).toBeDefined();
  });

  it('does not add that line when every card is already visible', () => {
    render(<ProductGallery images={many(5)} />);
    expect(screen.queryByText(/scroll for the rest/)).toBeNull();
  });

  it('still selects the photograph that was pressed at either density', async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={many(33)} />);
    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[20]!);
    expect(tabs[20]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('false');
  });
});

describe('ProductGallery, thumbnail containing block', () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      role: 'unknown' as const,
      alt: `Photo ${i + 1}`,
      node: <span data-testid={`frame-${i}`} />,
    }));

  // The dense variant does not rotate its buttons, so nothing else makes them
  // a CSS containing block for the fill image inside. Without `relative` here
  // explicitly, that image sizes itself to the whole scrollable strip instead
  // of the small thumbnail box: on gold-handles this showed as an enormous,
  // wrongly cropped photograph sitting under the frame, not a thumbnail row.
  it('gives every dense thumbnail its own containing block, not just the fanned ones', () => {
    const { container } = render(<ProductGallery images={many(33)} />);
    for (const tab of container.querySelectorAll('[role="tab"]')) {
      expect(tab.className).toContain('relative');
    }
  });

  it('keeps the containing block on fanned thumbnails too', () => {
    const { container } = render(<ProductGallery images={many(5)} />);
    for (const tab of container.querySelectorAll('[role="tab"]')) {
      expect(tab.className).toContain('relative');
    }
  });
});
