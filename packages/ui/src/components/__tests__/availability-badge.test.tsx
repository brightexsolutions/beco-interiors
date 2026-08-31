import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvailabilityBadge } from '../availability-badge';

describe('AvailabilityBadge', () => {
  it('renders NOTHING when the price already says POA', () => {
    // "Price on application" next to "Call for price" is the same sentence
    // twice, which is what the first version shipped.
    const { container } = render(
      <AvailabilityBadge availability="poa" priceDisplayMode="poa" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('still shows for POA availability on a priced product', () => {
    render(<AvailabilityBadge availability="poa" priceDisplayMode="fixed" />);
    expect(screen.getByText('Enquire')).toBeDefined();
  });

  it('shows in stock, which is real information', () => {
    render(<AvailabilityBadge availability="in_stock" priceDisplayMode="fixed" />);
    expect(screen.getByText('In stock')).toBeDefined();
  });

  it('is a label, not a boxed control', () => {
    // A border made it read as a form field rather than a status.
    const { container } = render(
      <AvailabilityBadge availability="in_stock" priceDisplayMode="fixed" />,
    );
    expect(container.firstElementChild?.className).not.toMatch(/border/);
  });
});
