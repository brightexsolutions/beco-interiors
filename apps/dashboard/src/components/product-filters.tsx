'use client';

import { ListFilters } from '@/components/list-filters';

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'pre_order', label: 'Pre-order' },
  { value: 'poa', label: 'Enquire' },
  { value: 'out', label: 'Out of stock' },
];

const PUBLISHED_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

const STOCK_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

/** Phone: search full width, the three filters under it. From xl, one row. */
export function ProductFilters({ count }: { count?: string | undefined } = {}) {
  return (
    <ListFilters
      searchLabel="Search products"
      searchPlaceholder="Name, SKU or slug"
      count={count}
      filters={[
        { param: 'availability', label: 'Availability', options: AVAILABILITY_OPTIONS },
        { param: 'published', label: 'Published', options: PUBLISHED_OPTIONS },
        { param: 'stock', label: 'Stock', options: STOCK_OPTIONS },
      ]}
    />
  );
}
