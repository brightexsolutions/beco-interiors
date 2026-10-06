import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * The product page, rendered whole, on a stone and on a hinge.
 *
 * A hinge photograph comes through the import with the `slab` role, because
 * it is the item's own shot, so it used to be badged "Full slab", and the
 * empty specification line promised slab dimensions. Both rows below carry
 * exactly that: a `slab` role image and no specs. Only the tree differs.
 */
const stoneGroup = {
  id: 'g', name: 'Sintered Stone', slug: 'sintered-stone', description: null,
  source_path: null, parent_id: null, product_count: 0,
};
const hardwareGroup = { ...stoneGroup, id: 'h', name: 'Hardware', slug: 'hardware' };
const node = (slug: string, name: string, source_path: string) => ({
  id: slug, name, slug, description: null, source_path, parent_id: 'x', product_count: 1,
  children: [], total_count: 1,
});

const product = (slug: string, name: string, category: { name: string; slug: string }) => ({
  id: slug, name, slug, price: null, compare_at_price: null, price_display_mode: 'poa' as const,
  availability: 'in_stock' as const, stock_quantity: null, face_type: null, unit: null, badge: null,
  images: [{ role: 'slab', path: `${category.slug}/${slug}/slab-0`, alt: name, width: 800, height: 1000 }],
  description: null, short_description: null, sku: null, specs: {}, meta_title: null, meta_description: null,
  category: { ...category, description: null },
});

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock('@/lib/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/products')>();
  return {
    ...actual,
    getProductBySlug: vi.fn(async (slug: string) =>
      slug === 'hinge-1187'
        ? product('hinge-1187', 'Black Hinge 1187', { name: 'Black Hinges', slug: 'black-hinges' })
        : product('beverly-gold', 'Beverly Gold', { name: 'Heixin 12mm', slug: 'heixin-12mm' })),
    getRelatedProducts: vi.fn(async () => []),
    getCategoryWithTree: vi.fn(async (slug: string) =>
      slug === 'black-hinges'
        ? {
            category: node('black-hinges', 'Black Hinges', 'HINGES/BLACK HINGES'),
            parent: node('hinges', 'Hinges', 'HINGES'),
            ancestors: [hardwareGroup, node('hinges', 'Hinges', 'HINGES')],
            children: [],
          }
        : {
            // Heixin's own slug and name say nothing about stone; its
            // ancestry does.
            category: node('heixin-12mm', 'Heixin 12mm', '12MM SINTERED STONES/HEIXIN 12MM'),
            parent: node('12mm-sintered-stones', '12mm Sintered Stones', '12MM SINTERED STONES'),
            ancestors: [stoneGroup, node('12mm-sintered-stones', '12mm Sintered Stones', '12MM SINTERED STONES')],
            children: [],
          }),
  };
});

const { default: ProductPage } = await import('../page');

const renderPage = async (slug: string) =>
  render(await ProductPage({ params: Promise.resolve({ slug }) }));

describe('product page wording by material', () => {
  it('keeps the stone wording on a stone', async () => {
    await renderPage('beverly-gold');
    expect(screen.getByText('Full slab')).toBeDefined();
    expect(screen.getByText(/including slab dimensions and finish options/)).toBeDefined();
  });

  it('never calls a hinge a slab', async () => {
    const { container } = await renderPage('hinge-1187');
    expect(screen.getByText('Product photo')).toBeDefined();
    expect(screen.getByText(/Sizes, finishes and fixings come with your quote/)).toBeDefined();
    // What a reader sees. The JSON-LD carries the image key, `slab-0`, which
    // is a storage path and not copy.
    container.querySelectorAll('script').forEach((s) => s.remove());
    expect(container.textContent).not.toMatch(/slab/i);
  });
});
