'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Input, Select } from '@beco/ui';
import type { OrderOwnerFilter } from '@/lib/orders';

export interface OrderOwnerOption {
  value: OrderOwnerFilter;
  label: string;
}

export function OrderFilters({ ownerOptions }: { ownerOptions: OrderOwnerOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const owner = searchParams.get('owner') ?? ownerOptions[0]?.value ?? 'all';
  const status = searchParams.get('status') ?? '';
  const payment = searchParams.get('payment') ?? '';
  const source = searchParams.get('source') ?? '';

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
    <div className="grid min-w-0 grid-cols-2 gap-2 overflow-x-hidden sm:grid-cols-4 lg:flex lg:items-end">
      <label className="col-span-full min-w-0 lg:min-w-0 lg:flex-1">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, phone or reference"
          aria-label="Search orders"
          className="min-w-0"
        />
      </label>
      {ownerOptions.length > 1 ? (
        <label className="min-w-0 lg:w-44 lg:shrink-0">
          <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Owner</span>
          <Select value={owner} onChange={(event) => setParam('owner', event.target.value)} aria-label="Filter by owner" className="min-w-0">
            {ownerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      <label className="min-w-0 lg:w-40 lg:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Status</span>
        <Select value={status} onChange={(event) => setParam('status', event.target.value)} aria-label="Filter by status" className="min-w-0">
          <option value="">Any</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </label>
      <label className="min-w-0 lg:w-40 lg:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Payment</span>
        <Select value={payment} onChange={(event) => setParam('payment', event.target.value)} aria-label="Filter by payment" className="min-w-0">
          <option value="">Any</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </Select>
      </label>
      <label className="min-w-0 lg:w-40 lg:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Source</span>
        <Select value={source} onChange={(event) => setParam('source', event.target.value)} aria-label="Filter by source" className="min-w-0">
          <option value="">Any</option>
          <option value="web">Website</option>
          <option value="walk_in">Walk in</option>
          <option value="phone">Phone</option>
          <option value="whatsapp">WhatsApp</option>
        </Select>
      </label>
    </div>
  );
}
