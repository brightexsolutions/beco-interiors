'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { Field, Input, cn } from '@beco/ui';
import { searchCustomers } from '@/lib/customers';
import type { CustomerMatch } from '@/lib/customer-search';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });

/**
 * Search earlier quotes for the person at the counter. Picking a result
 * fills name, phone and email; nothing is saved until the quote is. A
 * miss is not an error: the fields below take a new customer as they are.
 */
export function CustomerFinder({ onPick }: { onPick: (match: CustomerMatch) => void }) {
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
          setError('Customer search is not available right now. Type the details below.');
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
      <Field label="Returning customer" htmlFor={inputId} hint="Name, phone or company">
        <Input
          id={inputId}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          placeholder="Search earlier quotes"
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
        {searching && term.length >= 2 ? (
          <p className="mt-2 font-ui text-sm text-neutral-500">Searching</p>
        ) : null}
        {error ? <p className="mt-2 font-ui text-sm text-neutral-500">{error}</p> : null}
        {showNone ? (
          <p className="mt-2 font-ui text-sm text-neutral-500">No earlier quotes match. Fill in a new customer below.</p>
        ) : null}
        {matches.length > 0 && term.length >= 2 ? (
          <ul className="mt-2 divide-y divide-neutral-100 border border-neutral-200">
            {matches.map((match) => (
              <li key={match.phone}>
                <button
                  type="button"
                  onClick={() => pick(match)}
                  className={cn(
                    'flex min-h-14 w-full flex-col items-start gap-0.5 px-3 py-2 text-left font-ui',
                    'hover:bg-neutral-50 focus-visible:bg-neutral-50',
                  )}
                >
                  <span className="text-base font-semibold text-charcoal">{match.name}</span>
                  <span className="text-sm tabular-nums text-neutral-500">
                    {[match.phone, match.company].filter(Boolean).join(' · ')}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {match.quoteCount === 1 ? '1 quote' : `${match.quoteCount} quotes`}, last {shortDate(match.lastQuotedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
