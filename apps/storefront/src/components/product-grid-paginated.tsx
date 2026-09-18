'use client';

import { useState } from 'react';
import { buttonClasses } from '@beco/ui';
import { ProductGrid } from './product-grid';
import type { CatalogueProduct } from '@/lib/products';

const PAGE_SIZE = 12;

/**
 * The general grid, a page at a time.
 *
 * The whole catalogue rendered in one grid was every product at once below
 * the curated rails, reported directly as too much: Featured already gives a
 * considered first look, so what follows should be reachable a page at a
 * time rather than a wall of everything. All of it is already on the page in
 * `products`, fetched once server side, so "view more" reveals more of what
 * is already here rather than a second request.
 *
 * Not used under a filter: a reader who has already searched or picked a
 * facet asked to see a specific, usually much smaller set, and truncating
 * that would hide results they deliberately asked for.
 */
export function ProductGridPaginated({ products }: { products: CatalogueProduct[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = products.slice(0, visible);
  const remaining = products.length - shown.length;

  return (
    <div>
      <ProductGrid products={shown} />
      {remaining > 0 ? (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className={buttonClasses({ variant: 'outline' })}
          >
            View {Math.min(remaining, PAGE_SIZE)} more
          </button>
        </div>
      ) : null}
    </div>
  );
}
