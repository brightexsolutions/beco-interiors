'use client';

/**
 * The quote list, held in localStorage.
 *
 * No account is ever required to build one, and it must survive a refresh,
 * because a buyer who loses a half built list does not rebuild it. The key is
 * the prototype's own `beco_quote_cart_v1`, so anyone who used the old site
 * keeps their list.
 *
 * State changes are broadcast on a custom event as well as the native
 * `storage` event: `storage` fires in OTHER tabs only, so without the custom
 * event the header counter would not move in the tab you are actually using.
 */
export const STORAGE_KEY = 'beco_quote_cart_v1';
export const CHANGED_EVENT = 'beco:quote-list-changed';

export interface QuoteLine {
  slug: string;
  name: string;
  quantity: number;
  unit: string | null;
  /** Snapshot, so the list renders without a database round trip. */
  image: string | null;
}

const isLine = (v: unknown): v is QuoteLine =>
  typeof v === 'object' && v !== null &&
  typeof (v as QuoteLine).slug === 'string' &&
  typeof (v as QuoteLine).name === 'string' &&
  Number.isFinite((v as QuoteLine).quantity);

export function readList(): QuoteLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Anything malformed is discarded rather than thrown: a corrupted list is
    // not a reason to break the page a customer is trying to buy from.
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    return [];
  }
}

function write(lines: QuoteLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private mode, or storage full. The list is a convenience, not the
    // record of truth, so a failure here must not stop the page working.
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

export function addLine(line: Omit<QuoteLine, 'quantity'>, quantity = 1): QuoteLine[] {
  const lines = readList();
  const existing = lines.find((l) => l.slug === line.slug);
  // Adding something already listed increases it rather than duplicating the
  // row, which is what a person means by adding it again.
  if (existing) existing.quantity += quantity;
  else lines.push({ ...line, quantity });
  write(lines);
  return lines;
}

export function setQuantity(slug: string, quantity: number): QuoteLine[] {
  const lines = readList()
    .map((l) => (l.slug === slug ? { ...l, quantity } : l))
    .filter((l) => l.quantity > 0);
  write(lines);
  return lines;
}

export function removeLine(slug: string): QuoteLine[] {
  const lines = readList().filter((l) => l.slug !== slug);
  write(lines);
  return lines;
}

export function clearList(): void {
  write([]);
}

export const lineCount = (lines: QuoteLine[]): number =>
  lines.reduce((total, l) => total + l.quantity, 0);

/** A slab is cut to order, so it is bought in halves. A handle is not, and
    "2.5 handles" means nothing, so the step and the floor a quantity control
    allows are a property of what is actually being added, read from the same
    `unit` the product already carries, never a constant. Shared by the
    product page's control and the card's, so the two cannot quietly drift
    apart the way they already had before this was pulled out. */
export const stepFor = (unit: string | null): { step: number; floor: number } =>
  unit === 'per slab' ? { step: 0.5, floor: 0.5 } : { step: 1, floor: 1 };

/** Subscribes to changes in this tab and in others. Returns an unsubscribe. */
export function subscribe(fn: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(CHANGED_EVENT, fn);
    window.removeEventListener('storage', fn);
  };
}
