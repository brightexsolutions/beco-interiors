import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriceDisplay, formatPrice } from '../price-display';

describe('formatPrice', () => {
  it('formats Kenyan shillings without decimals', () => {
    expect(formatPrice(25000)).toBe('KES 25,000');
    expect(formatPrice(1850)).toBe('KES 1,850');
  });
});

describe('PriceDisplay', () => {
  it('shows POA as a deliberate state, not a missing price', () => {
    // Everything launches POA, so this must read as intentional.
    render(<PriceDisplay priceDisplayMode="poa" unit="per slab" />);
    expect(screen.getByText('Price on application')).toBeDefined();
  });

  it('falls back to POA if mode says fixed but no price exists', () => {
    // Defensive: a half filled spreadsheet row must never render "KES null".
    render(<PriceDisplay priceDisplayMode="fixed" price={null} />);
    expect(screen.getByText('Price on application')).toBeDefined();
  });

  it('shows a fixed price with its unit', () => {
    render(<PriceDisplay priceDisplayMode="fixed" price={25000} unit="per slab" />);
    expect(screen.getByText('KES 25,000')).toBeDefined();
    expect(screen.getByText('per slab')).toBeDefined();
  });

  it('strikes through the original only when it is genuinely higher', () => {
    const { container } = render(
      <PriceDisplay priceDisplayMode="fixed" price={22000} compareAtPrice={25000} />,
    );
    expect(container.querySelector('.line-through')?.textContent).toBe('KES 25,000');
  });

  it('does NOT strike through when compareAtPrice is not a discount', () => {
    // A stale or mistyped compare price must not fake a sale.
    const { container } = render(
      <PriceDisplay priceDisplayMode="fixed" price={25000} compareAtPrice={25000} />,
    );
    expect(container.querySelector('.line-through')).toBeNull();
  });

  it('never renders both a price and the POA text', () => {
    // The whole point of the component: no ambiguity, ever.
    const { container } = render(<PriceDisplay priceDisplayMode="fixed" price={25000} />);
    expect(container.textContent).not.toContain('Price on application');
  });
});
