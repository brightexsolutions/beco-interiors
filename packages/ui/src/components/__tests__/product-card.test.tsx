import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCard } from '../product-card';

describe('ProductCard', () => {
  it('renders a POA product without inventing a price, and says it ONCE', () => {
    render(<ProductCard name="Limestone Ivory" href="/product/limestone-ivory"
                        priceDisplayMode="poa" availability="poa" />);
    // The heading link is the product's one accessible name. With no photo,
    // a charcoal specimen plate also shows the name, but aria-hidden, so a
    // screen reader still hears it exactly once.
    expect(screen.getByRole('link', { name: 'Limestone Ivory' })).toBeDefined();
    expect(screen.getByText('Price on application')).toBeDefined();
    // The badge suppresses itself here. Saying "Price on application" beside
    // "Call for price" is the same sentence twice, which is what shipped first.
    expect(screen.queryByText(/call for price|enquire/i)).toBeNull();
  });

  it('the CARD itself has no border and no shadow, which is the whole point', () => {
    // A shadow lift on a white card is the framework default and reads as one.
    // Scoped to the card and its image frame: the availability badge has a
    // border by design, so scanning the whole subtree would be wrong.
    const { container } = render(
      <ProductCard name="X" href="/x" priceDisplayMode="poa" />,
    );
    const card = container.querySelector('a')!;
    const frame = container.querySelector('.aspect-\\[4\\/5\\]')!;
    for (const el of [card, frame]) {
      expect(el.className).not.toMatch(/shadow/);
      expect(el.className).not.toMatch(/(^|\s)border($|\s|-)/);
    }
  });

  it('keeps a fixed 4:5 frame so a grid never shifts', () => {
    const { container } = render(<ProductCard name="X" href="/x" priceDisplayMode="poa" />);
    expect(container.querySelector('.aspect-\\[4\\/5\\]')).not.toBeNull();
  });

  it('disables the hover motion under reduced motion', () => {
    const { container } = render(<ProductCard name="X" href="/x" priceDisplayMode="poa" />);
    expect(container.innerHTML).toContain('motion-reduce:group-hover:scale-100');
  });

  it('makes the whole card clickable, not only the product name', () => {
    // Reported directly: a shopper reaching for the photograph, not the
    // title, found nothing there. The old stretched link put `after:inset-0`
    // on the name anchor itself, which only ever covers that anchor's own
    // inline-block box, title sized, since giving that same element
    // `relative` makes it the containing block for its own pseudo-element
    // rather than the card. This asserts the real fix: a second anchor sized
    // to the whole card.
    const { container } = render(
      <ProductCard name="Limestone Ivory" href="/product/limestone-ivory" priceDisplayMode="poa" />,
    );
    const overlay = container.querySelector('a[aria-hidden]');
    expect(overlay).not.toBeNull();
    expect(overlay!.getAttribute('href')).toBe('/product/limestone-ivory');
    expect(overlay!.className).toMatch(/inset-0/);
    // Out of tab order and out of the accessibility tree: the name anchor
    // stays the one link a keyboard or screen reader user reaches, so the
    // product is never announced twice.
    expect(overlay!.getAttribute('tabindex')).toBe('-1');
    expect(screen.getAllByRole('link', { name: 'Limestone Ivory' })).toHaveLength(1);
  });

  it('shows a sale price with the original struck through', () => {
    const { container } = render(
      <ProductCard name="X" href="/x" priceDisplayMode="fixed"
                   price={22000} compareAtPrice={25000} badge="sale" />,
    );
    expect(screen.getByText('KES 22,000')).toBeDefined();
    expect(container.querySelector('.line-through')?.textContent).toBe('KES 25,000');
    expect(screen.getByText('Sale')).toBeDefined();
  });
});
