import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCard } from '../product-card';

describe('ProductCard', () => {
  it('renders a POA product without inventing a price, and says it ONCE', () => {
    render(<ProductCard name="Limestone Ivory" href="/product/limestone-ivory"
                        priceDisplayMode="poa" availability="poa" />);
    expect(screen.getByText('Limestone Ivory')).toBeDefined();
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
