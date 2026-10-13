import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { HomeCatalogue, catalogueRows } from '../home-catalogue';

const catalogue = { published: 212, unavailable: 4, poa: 31, draft: 7, low_stock: 3 };

describe('catalogueRows', () => {
  it('links each figure to the filtered list behind it and flags low stock alone', () => {
    const rows = catalogueRows(catalogue);
    expect(rows.map((row) => [row.label, row.value, row.href])).toEqual([
      ['On the website', 212, '/products?published=published'],
      ['Drafts', 7, '/products?published=draft'],
      ['Low stock', 3, '/products?stock=low'],
      ['Price on request', 31, '/products?availability=poa'],
    ]);
    expect(rows.filter((row) => row.attention).map((row) => row.label)).toEqual(['Low stock']);
    expect(catalogueRows({ ...catalogue, low_stock: 0 }).find((row) => row.label === 'Low stock')?.attention).toBe(false);
  });
});

describe('HomeCatalogue', () => {
  it('draws four linked figures with what each asks for', () => {
    render(<HomeCatalogue catalogue={catalogue} />);
    expect(screen.getByRole('heading', { name: 'Catalogue' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /On the website 212/ })).toHaveAttribute('href', '/products?published=published');
    expect(screen.getByRole('link', { name: /Low stock 3 At or below the reorder mark/ })).toHaveAttribute('href', '/products?stock=low');
    expect(screen.getByRole('link', { name: 'Open the catalogue' })).toHaveAttribute('href', '/products');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<HomeCatalogue catalogue={catalogue} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
