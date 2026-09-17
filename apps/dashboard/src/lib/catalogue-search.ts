import type { CatalogueHit, CatalogueRange } from '@/lib/catalogue';

export interface CatalogueRangeGroup {
  name: string;
  ranges: CatalogueRange[];
}

export interface SplitCatalogueRanges {
  ungrouped: CatalogueRange[];
  groups: CatalogueRangeGroup[];
}

export interface CatalogueHitGroup {
  name: string;
  hits: CatalogueHit[];
}

/**
 * Leaf ranges hang off editorial groups (Hardware, Sintered Stone).
 * Lighting is a pillar with no children, so it stays ungrouped.
 */
export function splitCatalogueRanges(ranges: CatalogueRange[]): SplitCatalogueRanges {
  const ungrouped: CatalogueRange[] = [];
  const grouped = new Map<string, CatalogueRange[]>();

  for (const range of ranges) {
    if (!range.groupName) {
      ungrouped.push(range);
      continue;
    }
    const current = grouped.get(range.groupName) ?? [];
    current.push(range);
    grouped.set(range.groupName, current);
  }

  return {
    ungrouped,
    groups: Array.from(grouped.entries()).map(([name, items]) => ({ name, ranges: items })),
  };
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
