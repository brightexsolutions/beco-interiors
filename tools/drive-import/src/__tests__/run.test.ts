import { describe, expect, it } from 'vitest';
import { finishPlacement, needsProcessing, productWriteFields, retirementReason, umbrellaRetirements, type ProductIdentity, type ProductPhotography } from '../run';
import type { ImageEntry } from '../merge-images';

/**
 * `executePlan` itself talks to Supabase, R2 and the Drive API directly, so
 * it is exercised end to end by a real import rather than mocked here. What
 * IS unit testable, and was not before this fix, is the rule that decides
 * which fields a write actually carries: the second real bug, where a
 * product renamed or recategorised in the dashboard got reverted to its
 * Drive folder name the next time anything in that folder changed.
 */

const IMAGE: ImageEntry = {
  role: 'slab',
  path: '12mm-sintered-stones/amber-jade/slab-0',
  alt: 'Amber Jade, 12mm Sintered Stones, slab',
  width: 1600,
  height: 1200,
  blur: 'data:image/jpeg;base64,stub',
  avgColor: '#ffffff',
  dominantColor: '#eeeeee',
  lightness: 80,
  uniformBackground: true,
  sort: 0,
  driveFileId: '1',
};

const fields: ProductIdentity & ProductPhotography = {
  name: 'Amber Jade',
  category_id: 'cat-123',
  images: [IMAGE],
  source_path: '12MM SINTERED STONES/AMBER JADE',
};

describe('productWriteFields', () => {
  it('never sends name or category_id for a product that already exists, so a dashboard rename or recategorisation survives a photo only re-run', () => {
    const write = productWriteFields(true, fields);

    expect(write).not.toHaveProperty('name');
    expect(write).not.toHaveProperty('category_id');
    expect(write).toEqual({ images: fields.images, source_path: fields.source_path });
  });

  it('sets name and category_id on the first write, when the product does not exist yet', () => {
    const write = productWriteFields(false, fields);

    expect(write).toEqual(fields);
    expect(write).toMatchObject({ name: 'Amber Jade', category_id: 'cat-123' });
  });
});

describe('finishPlacement, D122', () => {
  const split = { folder: 'HINGES', noun: 'Hinge', ref: '1193' };

  it('files a read finish under its own sub range, named the way Beco would name the folder', () => {
    expect(finishPlacement(split, 'black')).toEqual({
      name: 'Black Hinge 1193',
      chain: [
        { path: 'HINGES', slug: 'hinges', name: 'Hinges' },
        { path: 'HINGES/BLACK HINGES', slug: 'black-hinges', name: 'Black Hinges' },
      ],
    });
    expect(finishPlacement(split, 'gold').chain[1]).toEqual({ path: 'HINGES/GOLD HINGES', slug: 'gold-hinges', name: 'Gold Hinges' });
    expect(finishPlacement({ folder: 'FURNITURE LEGS', noun: 'Furniture Leg', ref: '4517' }, 'gold')).toEqual({
      name: 'Gold Furniture Leg 4517',
      chain: [
        { path: 'FURNITURE LEGS', slug: 'furniture-legs', name: 'Furniture Legs' },
        { path: 'FURNITURE LEGS/GOLD FURNITURE LEGS', slug: 'gold-furniture-legs', name: 'Gold Furniture Legs' },
      ],
    });
  });

  it('leaves an unclear finish in the range itself, unsorted, rather than guessing', () => {
    expect(finishPlacement(split, null)).toEqual({
      name: 'Hinge 1193',
      chain: [{ path: 'HINGES', slug: 'hinges', name: 'Hinges' }],
    });
  });
});

describe('umbrellaRetirements and retirementReason', () => {
  it('lists finish, per photograph and item folders, each with what replaced the umbrella', () => {
    expect(umbrellaRetirements({
      finishFolders: [{ folder: 'HINGES', count: 3 }],
      photoFolders: [{ folder: 'BAMBOO VENEER WALL PANELS', count: 35 }],
      itemFolders: [{ folder: 'HANDLES/KNOBS', items: 30, files: 35 }],
    })).toEqual([
      { folder: 'HINGES', replacedBy: 'photograph' },
      { folder: 'BAMBOO VENEER WALL PANELS', replacedBy: 'photograph' },
      { folder: 'HANDLES/KNOBS', replacedBy: 'item' },
    ]);
  });

  it('names the product and the folder in the issue it records', () => {
    const reason = retirementReason('Knobs', 'HANDLES/KNOBS', 'item');
    expect(reason).toContain('"Knobs" held every photograph in "HANDLES/KNOBS" as one product');
    expect(reason).toContain('Each item is now its own product, so it was unpublished');
    expect(retirementReason('Hinges', 'HINGES', 'photograph')).toContain('Each photograph is now its own product');
  });
});

describe('needsProcessing', () => {
  it('processes a new or changed file whether or not its product exists', () => {
    expect(needsProcessing({ needsDownload: true }, true)).toBe(true);
    expect(needsProcessing({ needsDownload: true }, false)).toBe(true);
  });

  it('processes an unchanged file only when its product has no row yet', () => {
    // The old single Hinges product's photographs are unchanged files, and
    // each must still become a product of its own.
    expect(needsProcessing({ needsDownload: false }, false)).toBe(true);
    // Running twice must change nothing the second time.
    expect(needsProcessing({ needsDownload: false }, true)).toBe(false);
  });
});
