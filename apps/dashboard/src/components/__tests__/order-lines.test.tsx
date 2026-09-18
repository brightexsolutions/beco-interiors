import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { OrderLines } from '../order-lines';
import type { OrderLine } from '@/lib/order-detail';

const line = (over: Partial<OrderLine> = {}): OrderLine => ({
  id: '11111111-1111-4111-8111-111111111111',
  description: 'ZZ Seed Jatoba Brown',
  quantity: 4,
  unitPrice: 77000,
  listPrice: 77000,
  lineTotal: 308000,
  productId: '22222222-2222-4222-8222-222222222222',
  ...over,
});

const priced = {
  isPriced: true as const,
  gross: 308000,
  net: 265517.24,
  vat: 42482.76,
};

describe('OrderLines', () => {
  it('keeps the catalogue strike on the item, never on the line total', () => {
    render(
      <OrderLines
        lines={[line({ unitPrice: 77000, listPrice: 85000, lineTotal: 308000 })]}
        totals={priced}
      />,
    );

    expect(screen.getByText('ZZ Seed Jatoba Brown')).toBeInTheDocument();
    const catalogue = screen.getByText(/85,000/);
    expect(catalogue.className).toContain('line-through');
    expect(catalogue.parentElement).toHaveTextContent(/Catalogue/);
    expect(screen.getAllByText(/308,000/).every((node) => !node.className.includes('line-through'))).toBe(true);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/265,517/)).toBeInTheDocument();
  });

  it('does not strike the catalogue price when the unit matches list', () => {
    render(<OrderLines lines={[line()]} totals={priced} />);
    expect(screen.queryByText('Catalogue')).toBeNull();
  });

  it('says pricing on application when a line is still unpriced', () => {
    render(
      <OrderLines
        lines={[line({ unitPrice: 0, lineTotal: 0 })]}
        totals={{ isPriced: false, gross: 0, net: 0, vat: 0 }}
      />,
    );
    expect(screen.getAllByText('POA').length).toBeGreaterThan(0);
    expect(screen.getByText('Pricing on application')).toBeInTheDocument();
    expect(screen.queryByText('Total')).toBeNull();
  });

  it('is axe clean', async () => {
    const { container } = render(
      <OrderLines
        lines={[line({ unitPrice: 77000, listPrice: 85000, lineTotal: 308000 })]}
        totals={priced}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
