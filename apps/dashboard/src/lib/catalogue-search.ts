import type { CatalogueHit } from '@/lib/catalogue';

export interface CatalogueHitGroup {
  name: string;
  hits: CatalogueHit[];
}

export function groupHitsByCategory(hits: CatalogueHit[]): CatalogueHitGroup[] {
  const groups: CatalogueHitGroup[] = [];
  const index = new Map<string, CatalogueHitGroup>();

  for (const hit of hits) {
    const name = hit.categoryName ?? 'Uncategorised';
    const existing = index.get(name);
    if (existing) {
      existing.hits.push(hit);
      continue;
    }
    const group = { name, hits: [hit] };
    index.set(name, group);
    groups.push(group);
  }

  return groups;
}

/**
 * Narrows the picker's loaded catalogue on the phone, with no round trip.
 * Mirrors what the server search did: a range keeps the products filed
 * directly in it, the select only offers ranges that hold products of their
 * own. With no range, typing matches a product name, its range name or the
 * range above it, so "handle" finds the hardware and "sintered" finds the
 * stones. Inside a range, typing matches the product name only, since every
 * product there already shares the range's name. Case does not matter. The
 * loaded order (range name, then product name) is kept.
 */
export function filterCatalogue(
  hits: CatalogueHit[],
  { term, rangeId }: { term: string; rangeId: string | null },
): CatalogueHit[] {
  const needle = term.trim().toLowerCase();
  const range = rangeId || null;
  if (!needle && !range) return hits;
  return hits.filter((hit) => {
    if (range && hit.categoryId !== range) return false;
    if (!needle) return true;
    if (hit.name.toLowerCase().includes(needle)) return true;
    if (range) return false;
    return (
      (hit.categoryName?.toLowerCase().includes(needle) ?? false) ||
      (hit.parentCategoryName?.toLowerCase().includes(needle) ?? false)
    );
  });
}
