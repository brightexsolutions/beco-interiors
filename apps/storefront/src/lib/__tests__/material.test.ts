import { describe, expect, it } from 'vitest';
import { isStoneRange, specNote, stockCount } from '../material';
import { buildCategoryTree, placeInTree, type Category } from '../products';

/**
 * Stone wording on stone, plain wording on everything else, decided by the
 * tree. The categories below are the real taxonomy as the import leaves it,
 * including the Heixin sub range, whose products carry no unit and no face
 * type, and the groups, which carry no Drive path.
 */
const cat = (id: string, name: string, source_path: string | null, parent_id: string | null): Category => ({
  id, name, slug: id, source_path, parent_id, description: null, product_count: 1,
});

const tree = buildCategoryTree([
  cat('sintered-stone', 'Sintered Stone', null, null),
  cat('12mm-sintered-stones', '12mm Sintered Stones', '12MM SINTERED STONES', 'sintered-stone'),
  cat('heixin-12mm', 'Heixin 12mm', '12MM SINTERED STONES/HEIXIN 12MM', '12mm-sintered-stones'),
  cat('15mm-sintered-stones', '15mm Sintered Stones', '15MM SINTERED STONES', 'sintered-stone'),
  cat('hardware', 'Hardware', null, null),
  cat('hinges', 'Hinges', 'HINGES', 'hardware'),
  cat('gold-hinges', 'Gold Hinges', 'HINGES/GOLD HINGES', 'hinges'),
  cat('furniture-legs', 'Furniture Legs', 'FURNITURE LEGS', 'hardware'),
  cat('handles', 'Handles', 'HANDLES', null),
  cat('black-handles', 'Black Handles', 'HANDLES/BLACK HANDLES', 'handles'),
  cat('wall-panels', 'Wall Panels', null, null),
  cat('fluted-wall-panels', 'Fluted Wall Panels', 'FLUTED WALL PANELS', 'wall-panels'),
]);

const stoneFor = (slug: string) => {
  const place = placeInTree(tree, slug);
  if (!place) throw new Error(`no ${slug} in the test tree`);
  return isStoneRange([place.category, ...place.ancestors]);
};

describe('isStoneRange', () => {
  it.each(['sintered-stone', '12mm-sintered-stones', 'heixin-12mm', '15mm-sintered-stones'])(
    'reads %s as stone',
    (slug) => expect(stoneFor(slug)).toBe(true),
  );

  it.each(['hardware', 'hinges', 'gold-hinges', 'furniture-legs', 'handles', 'black-handles', 'fluted-wall-panels'])(
    'reads %s as not stone',
    (slug) => expect(stoneFor(slug)).toBe(false),
  );

  it('still reads a stone range as stone when the group slug is renamed', () => {
    expect(isStoneRange([
      { slug: 'stone', name: 'Stone', source_path: null },
      { slug: 'heixin', name: 'Heixin', source_path: '12MM SINTERED STONES/HEIXIN 12MM' },
    ])).toBe(true);
  });

  it('is not stone with no category at all', () => {
    expect(isStoneRange([])).toBe(false);
    expect(isStoneRange([null, undefined])).toBe(false);
  });
});

describe('specNote', () => {
  it('keeps the slab line on stone', () => {
    expect(specNote(true)).toMatch(/slab dimensions/);
  });

  it('never mentions a slab on hardware', () => {
    expect(specNote(false)).not.toMatch(/slab/i);
    expect(specNote(false)).toMatch(/come with your quote/);
  });

  it('carries no em dash in either line', () => {
    expect(specNote(true) + specNote(false)).not.toMatch(/—/);
  });
});

describe('stockCount', () => {
  it('counts a stone range in colours', () => {
    expect(stockCount(24, true)).toBe('24 colours');
    expect(stockCount(1, true)).toBe('1 colour');
  });

  it('counts a hardware range in items, never colours', () => {
    expect(stockCount(18, stoneFor('gold-hinges'))).toBe('18 items');
    expect(stockCount(1, false)).toBe('1 item');
  });
});
