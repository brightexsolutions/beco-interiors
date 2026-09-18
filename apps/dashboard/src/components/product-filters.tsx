'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Input, Select } from '@beco/ui';

export function ProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const availability = searchParams.get('availability') ?? '';
  const published = searchParams.get('published') ?? '';
  const stock = searchParams.get('stock') ?? '';

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== (searchParams.get('search') ?? '')) setParam('search', search);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex-1 basis-full sm:basis-64">
        <span className="mb-1 block font-ui text-sm font-semibold text-charcoal">Search</span>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, SKU or slug"
          aria-label="Search products"
        />
      </label>
      <label>
        <span className="mb-1 block font-ui text-sm font-semibold text-charcoal">Availability</span>
        <Select
          value={availability}
          onChange={(event) => setParam('availability', event.target.value)}
          aria-label="Filter by availability"
        >
          <option value="">Any</option>
          <option value="in_stock">In stock</option>
          <option value="pre_order">Pre-order</option>
          <option value="poa">Enquire</option>
          <option value="out">Out of stock</option>
        </Select>
      </label>
      <label>
        <span className="mb-1 block font-ui text-sm font-semibold text-charcoal">Published</span>
        <Select
          value={published}
          onChange={(event) => setParam('published', event.target.value)}
          aria-label="Filter by published"
        >
          <option value="">Any</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </label>
      <label>
        <span className="mb-1 block font-ui text-sm font-semibold text-charcoal">Stock</span>
        <Select value={stock} onChange={(event) => setParam('stock', event.target.value)} aria-label="Filter by stock">
          <option value="">Any</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
      </label>
    </div>
  );
}
