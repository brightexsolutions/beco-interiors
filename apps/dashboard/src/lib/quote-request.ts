/**
 * The customer's own request, kept on the quote by submit_quote (D131), and
 * what has changed since. Lines are matched by id: a removed line's id is
 * gone, a changed quantity keeps its id, an added line has an id the request
 * never had. Prices are not compared: the customer never set one.
 */

export interface RequestedLine {
  id: string;
  description: string;
  code: string | null;
  quantity: number;
}

export interface QuoteRequest {
  /** `backfill` for a web quote submitted before D131: the lines as they stood on 7 October 2026. */
  source: 'submission' | 'backfill';
  at: string | null;
  lines: RequestedLine[];
}

export type RequestChange =
  | { kind: 'removed'; description: string; code: string | null; quantity: number }
  | { kind: 'quantity'; description: string; code: string | null; from: number; to: number }
  | { kind: 'added'; description: string; code: string | null; quantity: number };

interface CurrentLine {
  id: string;
  description: string;
  code: string | null;
  quantity: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads `quotes.requested_items`. Anything malformed reads as no request, never a crash. */
export function parseQuoteRequest(raw: unknown): QuoteRequest | null {
  if (!isRecord(raw)) return null;
  const source = raw.source;
  if (source !== 'submission' && source !== 'backfill') return null;
  if (!Array.isArray(raw.lines)) return null;
  const lines: RequestedLine[] = [];
  for (const item of raw.lines) {
    if (!isRecord(item)) return null;
    const quantity = Number(item.quantity);
    if (typeof item.id !== 'string' || typeof item.description !== 'string' || !Number.isFinite(quantity)) {
      return null;
    }
    lines.push({
      id: item.id,
      description: item.description,
      code: typeof item.code === 'string' && item.code ? item.code : null,
      quantity,
    });
  }
  return { source, at: typeof raw.at === 'string' ? raw.at : null, lines };
}

export function requestChanges(request: QuoteRequest | null, current: CurrentLine[]): RequestChange[] {
  if (!request) return [];
  const now = new Map(current.map((line) => [line.id, line]));
  const asked = new Set(request.lines.map((line) => line.id));
  const changes: RequestChange[] = [];

  for (const line of request.lines) {
    const kept = now.get(line.id);
    if (!kept) {
      changes.push({ kind: 'removed', description: line.description, code: line.code, quantity: line.quantity });
    } else if (kept.quantity !== line.quantity) {
      changes.push({
        kind: 'quantity',
        description: line.description,
        code: line.code,
        from: line.quantity,
        to: kept.quantity,
      });
    }
  }
  for (const line of current) {
    if (!asked.has(line.id)) {
      changes.push({ kind: 'added', description: line.description, code: line.code, quantity: line.quantity });
    }
  }
  return changes;
}
