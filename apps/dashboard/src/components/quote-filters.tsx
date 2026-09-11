'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Input, Select } from '@beco/ui';
import type { QuoteOwnerFilter } from '@/lib/quotes';

/**
 * Search, filter, sort target, with the URL as the source of truth: the
 * result set is server rendered from these params, so a filtered view is
 * shareable and the back button works, the same rule the storefront's
 * `ShopControls` follows.
 *
 * `ownerOptions` differs by role (`lib/access.ts`-adjacent, decided by the
 * page): a salesperson sees their own work and the shared queue, an admin
 * additionally sees everyone's, per PRD section 4.2's "role based views,
 * not just role based permissions."
 */
export interface OwnerOption {
  value: QuoteOwnerFilter;
  label: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Any source' },
  { value: 'web', label: 'Web' },
  { value: 'walk_in', label: 'Walk in' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export function QuoteFilters({ ownerOptions }: { ownerOptions: OwnerOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const owner = searchParams.get('owner') ?? ownerOptions[0]?.value ?? 'all';
  const status = searchParams.get('status') ?? '';
  const source = searchParams.get('source') ?? '';

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  // Debounced so every keystroke does not push a new URL.
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, phone or reference"
          aria-label="Search quotes"
        />
      </label>

      {ownerOptions.length > 1 ? (
        <label>
          <span className="mb-1 block font-ui text-sm font-semibold text-charcoal">Owner</span>
          <Select value={owner} onChange={(e) => setParam('owner', e.target.value)} aria-label="Filter by owner">
            {ownerOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      <label>
        <span className="mb-1 block font-ui text-sm font-semibold text-charcoal">Status</span>
        <Select value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Filter by status">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>

      <label>
        <span className="mb-1 block font-ui text-sm font-semibold text-charcoal">Source</span>
        <Select value={source} onChange={(e) => setParam('source', e.target.value)} aria-label="Filter by source">
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
