'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { ChipGroup, Input, Select } from '@beco/ui';
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

  const owner = searchParams.get('owner') || ownerOptions[0]?.value || 'all';
  const status = searchParams.get('status') ?? '';
  const payment = searchParams.get('payment') ?? '';
  const source = searchParams.get('source') ?? '';

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

  const select = (label: string, value: string, key: string, options: { value: string; label: string }[]) => (
    <label className="hidden min-w-0 lg:block lg:w-40 lg:shrink-0">
      <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">{label}</span>
      <Select value={value} onChange={(event) => setParam(key, event.target.value)} aria-label={`Filter by ${label.toLowerCase()}`} className="min-w-0">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-end">
        <label className="min-w-0 lg:flex-1">
          <Input
            type="search"
            enterKeyHint="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, phone or reference"
            aria-label="Search orders"
            className="min-w-0"
          />
        </label>
        {ownerOptions.length > 1 ? (
          <label className="hidden min-w-0 lg:block lg:w-44 lg:shrink-0">
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
        {select('Status', status, 'status', STATUS_OPTIONS)}
        {select('Payment', payment, 'payment', PAYMENT_OPTIONS)}
        {select('Source', source, 'source', SOURCE_OPTIONS)}
      </div>

      {/* Phone: one tap chips instead of four wheels. */}
      <div className="space-y-2 lg:hidden">
        {ownerOptions.length > 1 ? (
          <ChipGroup
            label="Owner"
            value={owner}
            onChange={(value) => setParam('owner', value)}
            options={ownerOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
        ) : null}
        <ChipGroup
          label="Payment"
          value={payment}
          clearValue=""
          onChange={(value) => setParam('payment', value)}
          options={PAYMENT_OPTIONS.map((o) => ({ ...o, label: o.value ? o.label : 'Paid or not' }))}
        />
        <ChipGroup
          label="Status"
          value={status}
          clearValue=""
          onChange={(value) => setParam('status', value)}
          options={STATUS_OPTIONS.map((o) => ({ ...o, label: o.value ? o.label : 'Any status' }))}
        />
      </div>
    </div>
  );
}
