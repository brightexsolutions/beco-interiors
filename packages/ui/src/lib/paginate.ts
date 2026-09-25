/**
 * Slice a list into a page. Used by dashboard queues so a long result set
 * stays inside the viewport (pagination) rather than growing the page.
 *
 * `page` is 1-based. Out of range values clamp, so a stale `?page=9` after
 * a filter narrows the set still renders something rather than an empty hole.
 */
export const DASHBOARD_LIST_PAGE_SIZE = 8;

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = DASHBOARD_LIST_PAGE_SIZE,
): {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  from: number;
  to: number;
  items: T[];
} {
  const total = items.length;
  const size = pageSize > 0 ? pageSize : DASHBOARD_LIST_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  const current = Math.min(pageCount, Math.max(1, requested));
  const start = (current - 1) * size;
  return {
    page: current,
    pageCount,
    pageSize: size,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
    items: items.slice(start, start + size),
  };
}
