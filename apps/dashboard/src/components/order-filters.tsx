'use client';

import { ListFilters } from '@/components/list-filters';
import type { OrderOwnerFilter } from '@/lib/orders';

export interface OrderOwnerOption {
  value: OrderOwnerFilter;
  label: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'web', label: 'Website' },
  { value: 'walk_in', label: 'Walk in' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

/** Search, owner, status, payment and source, written to the URL. */
export function OrderFilters({ ownerOptions, count }: { ownerOptions: OrderOwnerOption[]; count?: string | undefined }) {
  return (
    <ListFilters
      searchLabel="Search orders"
      searchPlaceholder="Name, phone or reference"
      count={count}
      filters={[
        ...(ownerOptions.length > 1
          ? [{ param: 'owner', label: 'Owner', options: ownerOptions, fallback: ownerOptions[0]?.value }]
          : []),
        { param: 'status', label: 'Status', options: STATUS_OPTIONS },
        { param: 'payment', label: 'Payment', options: PAYMENT_OPTIONS },
        { param: 'source', label: 'Source', options: SOURCE_OPTIONS },
      ]}
    />
  );
}
