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

  // Phone: search full width, three filters under it. Desktop (lg):
  // search plus the three selects share one row. Do not stack them on lg.
  return (
    <div className="grid min-w-0 grid-cols-3 gap-2 overflow-x-hidden xl:flex xl:items-end">
      <label className="col-span-full min-w-0 xl:min-w-0 xl:flex-1">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, SKU or slug"
          aria-label="Search products"
          className="min-w-0"
        />
      </label>
      <label className="min-w-0 xl:w-44 xl:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Availability</span>
        <Select
          value={availability}
          onChange={(event) => setParam('availability', event.target.value)}
          aria-label="Filter by availability"
          className="min-w-0"
        >
          <option value="">Any</option>
          <option value="in_stock">In stock</option>
          <option value="pre_order">Pre-order</option>
          <option value="poa">Enquire</option>
          <option value="out">Out of stock</option>
        </Select>
      </label>
      <label className="min-w-0 xl:w-40 xl:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Published</span>
        <Select
          value={published}
          onChange={(event) => setParam('published', event.target.value)}
          aria-label="Filter by published"
          className="min-w-0"
        >
          <option value="">Any</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </label>
      <label className="min-w-0 xl:w-40 xl:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Stock</span>
        <Select
          value={stock}
          onChange={(event) => setParam('stock', event.target.value)}
          aria-label="Filter by stock"
          className="min-w-0"
        >
          <option value="">Any</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
      </label>
    </div>
  );
}
