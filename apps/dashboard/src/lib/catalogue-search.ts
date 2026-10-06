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
