'use client';

import { useEffect, useId, useState, useTransition, type RefObject } from 'react';
import { Button, Field, Input, cn } from '@beco/ui';
import { searchCustomers } from '@/lib/customers';
import type { CustomerMatch } from '@/lib/customer-search';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });

const quotesLabel = (count: number) => (count === 0 ? 'No quotes yet' : count === 1 ? '1 quote' : `${count} quotes`);

/**
 * Find a customer record for a quote (D130): the same search as the old
 * returning-customer finder, now backed by the `customers` table. Name,
 * phone in any format, company, email or KRA PIN. Picking a result hands
 * it back; Add new client is the parent's to open, so a quote page can swap
 * its own dialog's body rather than stack a second dialog.
 */
export function CustomerPicker({
  onPick,
  onAddNew,
  label = 'Client',
  inputRef,
}: {
  onPick: (match: CustomerMatch) => void;
  onAddNew: () => void;
  label?: string | undefined;
  inputRef?: RefObject<HTMLInputElement | null> | undefined;
}) {
  const inputId = useId();
  const listId = `${inputId}-results`;
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState('');
  const [searching, startSearch] = useTransition();

  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) {
      setMatches([]);
      setError(null);
      setSearched('');
      return;
    }
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        try {
          setMatches(await searchCustomers(term));
          setError(null);
        } catch {
          setMatches([]);
          setError('Customer search is not available right now. Add the client instead.');
        }
        setSearched(term);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [term]);

  const pick = (match: CustomerMatch) => {
    onPick(match);
    setQuery('');
  };

  const showNone = !searching && !error && searched === term && term.length >= 2 && matches.length === 0;

  return (
    <div>
      <Field label={label} htmlFor={inputId} hint="Name, phone, company or KRA PIN">
        <Input
          id={inputId}
          ref={inputRef}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          placeholder="Search clients"
          aria-controls={listId}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (matches[0]) pick(matches[0]);
            }
          }}
        />
      </Field>
      <div id={listId} aria-live="polite">
        {searching && term.length >= 2 ? <p className="mt-2 font-ui text-sm text-neutral-500">Searching</p> : null}
        {error ? <p className="mt-2 font-ui text-sm text-neutral-500">{error}</p> : null}
        {showNone ? <p className="mt-2 font-ui text-sm text-neutral-500">No client matches. Add them as new.</p> : null}
        {matches.length > 0 && term.length >= 2 ? (
          <ul className="mt-2 divide-y divide-neutral-100 border border-neutral-200">
            {matches.map((match) => (
              <li key={match.id}>
                <button
                  type="button"
                  onClick={() => pick(match)}
                  className={cn(
                    'flex min-h-14 w-full flex-col items-start gap-0.5 px-3 py-2 text-left font-ui',
                    'hover:bg-neutral-50 focus-visible:bg-neutral-50',
                  )}
                >
                  <span className="text-base font-semibold text-charcoal [overflow-wrap:anywhere]">{match.name}</span>
                  <span className="text-sm tabular-nums text-neutral-500 [overflow-wrap:anywhere]">
                    {[match.phone, match.company].filter(Boolean).join(' · ')}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {quotesLabel(match.quoteCount)}
                    {match.lastActivityAt ? `, last ${shortDate(match.lastActivityAt)}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Button type="button" variant="outline" className="mt-3 h-11 w-full py-0" onClick={onAddNew}>
        Add new client
      </Button>
    </div>
  );
}
