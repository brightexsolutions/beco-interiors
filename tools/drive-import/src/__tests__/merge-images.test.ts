import { describe, expect, it } from 'vitest';
import {
  mergeProductImages,
  parseStoredImages,
  type ImageEntry,
  type ProcessedImage,
} from '../merge-images';
import type { PlannedFile } from '../plan';

/**
 * Reproduces the real bug: re-running the importer on a product folder that
 * already had photographs, after adding just one more, used to overwrite
 * `products.images` down to only what this run downloaded, silently
 * dropping every photograph it correctly chose not to re-fetch.
 */

const file = (
  driveFileId: string,
  role: PlannedFile['role'],
  overrides: Partial<PlannedFile> = {},
): PlannedFile => ({
  driveFileId,
  path: `12MM SINTERED STONES/AMBER JADE/${driveFileId}.jpg`,
  md5: 'x',
  categorySlug: '12mm-sintered-stones',
  categoryPath: '12MM SINTERED STONES',
  productSlug: 'amber-jade',
  productPath: '12MM SINTERED STONES/AMBER JADE',
  productName: 'Amber Jade',
  role,
  outcome: 'unchanged',
  needsDownload: false,
  ...overrides,
});

const stored = (driveFileId: string | null, role: ImageEntry['role'], sort: number): ImageEntry => ({
  role,
  path: `12mm-sintered-stones/amber-jade/${role}-${sort}`,
  alt: `Amber Jade, 12mm Sintered Stones, ${role}`,
  width: 1600,
  height: 1200,
  blur: 'data:image/jpeg;base64,stub',
  avgColor: '#ffffff',
  dominantColor: '#eeeeee',
  lightness: 80,
  uniformBackground: true,
  sort,
  driveFileId,
});

const processed = (driveFileId: string, role: ImageEntry['role']): ProcessedImage => ({
  role,
  path: `12mm-sintered-stones/amber-jade/${role}-new`,
  alt: `Amber Jade, 12mm Sintered Stones, ${role}`,
  width: 1600,
  height: 1200,
  blur: 'data:image/jpeg;base64,fresh',
  avgColor: '#101010',
  dominantColor: '#202020',
  lightness: 12,
  uniformBackground: true,
  driveFileId,
});

describe('mergeProductImages', () => {
  it('keeps every unchanged photo AND the newly added one, the core bug', () => {
    const existing = [
      stored('1', 'slab', 0),
      stored('2', 'on_stand', 1),
      stored('3', 'bookmatch', 2),
      stored('4', 'application', 3),
      stored('5', 'application', 4),
    ];
    const ordered = [
      file('1', 'slab'),
      file('2', 'on_stand'),
      file('3', 'bookmatch'),
      file('4', 'application'),
      file('5', 'application'),
      // The one file this run actually needed to fetch.
      file('6', 'application', { outcome: 'new', needsDownload: true }),
    ];
    const freshlyProcessed = new Map([['6', processed('6', 'application')]]);

    const merged = mergeProductImages(ordered, freshlyProcessed, existing);

    expect(merged).toHaveLength(6);
    expect(merged.map((m) => m.driveFileId)).toEqual(['1', '2', '3', '4', '5', '6']);
    // Carried entries are the SAME derivatives, not re-derived: an unchanged
    // photo was never downloaded this run, so there is nothing new to derive.
    expect(merged[0]).toMatchObject({ path: existing[0]!.path, avgColor: existing[0]!.avgColor });
    expect(merged[5]).toMatchObject({ path: processed('6', 'application').path, driveFileId: '6' });
  });

  it('drops a photo that is no longer in Drive at all', () => {
    const existing = [
      stored('1', 'slab', 0),
      stored('2', 'on_stand', 1),
      stored('3', 'application', 2),
    ];
    // File "2" was removed from the Drive folder: classify() marks it
    // `missing` and buildPlan never puts it back into `plan.files`, so it is
    // simply absent from `ordered` here.
    const ordered = [file('1', 'slab'), file('3', 'application')];

    const merged = mergeProductImages(ordered, new Map(), existing);

    expect(merged.map((m) => m.driveFileId)).toEqual(['1', '3']);
  });

  it('works cleanly for a folder that had no photographs before', () => {
    const ordered = [
      file('1', 'slab', { outcome: 'new', needsDownload: true }),
      file('2', 'on_stand', { outcome: 'new', needsDownload: true }),
      file('3', 'application', { outcome: 'new', needsDownload: true }),
    ];
    const freshlyProcessed = new Map([
      ['1', processed('1', 'slab')],
      ['2', processed('2', 'on_stand')],
      ['3', processed('3', 'application')],
    ]);

    const merged = mergeProductImages(ordered, freshlyProcessed, []);

    expect(merged).toHaveLength(3);
    expect(merged.map((m) => m.driveFileId)).toEqual(['1', '2', '3']);
    expect(merged.every((m) => m.sort === merged.indexOf(m))).toBe(true);
  });

  it('falls back to a role position match for entries written before driveFileId was recorded', () => {
    // Legacy data: written by a run before this fix, so it carries no
    // driveFileId at all.
    const existing = [stored(null, 'slab', 0), stored(null, 'on_stand', 1)];
    const ordered = [file('a1', 'slab'), file('a2', 'on_stand')];

    const merged = mergeProductImages(ordered, new Map(), existing);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ role: 'slab', avgColor: existing[0]!.avgColor });
    expect(merged[1]).toMatchObject({ role: 'on_stand', avgColor: existing[1]!.avgColor });
  });

  it('never grafts a stray legacy entry onto a file that failed processing this run', () => {
    // An unrelated legacy slab entry sitting in the array (perhaps itself
    // already orphaned) must not be handed to a DIFFERENT file just because
    // both happen to be role "slab".
    const existing = [stored(null, 'slab', 0)];
    const ordered = [file('9', 'slab', { outcome: 'changed', needsDownload: true })];

    // File "9" needed downloading and is absent from `processed`, meaning it
    // threw during processing and was recorded as a failure, not skipped.
    const merged = mergeProductImages(ordered, new Map(), existing);

    expect(merged).toHaveLength(0);
  });
});

describe('parseStoredImages', () => {
  it('returns an empty array for anything that is not an array', () => {
    expect(parseStoredImages(null)).toEqual([]);
    expect(parseStoredImages(undefined)).toEqual([]);
    expect(parseStoredImages('not json')).toEqual([]);
    expect(parseStoredImages({})).toEqual([]);
  });

  it('drops entries missing the fields needed to place them', () => {
    const raw = [{ role: 'slab' }, { path: '/x' }, { role: 'slab', path: '/a' }];
    expect(parseStoredImages(raw)).toHaveLength(1);
  });

  it('round trips a well formed entry including driveFileId', () => {
    const entry = stored('42', 'slab', 3);
    expect(parseStoredImages([entry])).toEqual([entry]);
  });

  it('defaults a missing driveFileId to null rather than throwing', () => {
    const { driveFileId, ...withoutId } = stored('1', 'slab', 0);
    void driveFileId;
    const [parsed] = parseStoredImages([withoutId]);
    expect(parsed!.driveFileId).toBeNull();
  });
});
