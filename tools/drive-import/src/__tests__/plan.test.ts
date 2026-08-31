import { describe, expect, it } from 'vitest';
import { buildPlan } from '../plan';
import type { DriveFile } from '../classify';
import type { FolderNode } from '../misnest';

/**
 * Fixtures reproducing EVERY defect actually found in the 29 August export.
 * A future change to the pipeline cannot silently start guessing without
 * failing here.
 */
const f = (id: string, path: string, md5 = 'x'): DriveFile => ({
  id, path, md5, size: 1024, modifiedTime: '2026-08-29T00:00:00Z',
});

const FOLDERS: FolderNode[] = [
  { path: 'AMBER JADE', name: 'AMBER JADE', depth: 1 },
  { path: 'CYPRUS LIGHT GREY', name: 'CYPRUS LIGHT GREY', depth: 1 },
  { path: 'LIMESTONE CREAMY', name: 'LIMESTONE CREAMY', depth: 1 },
  { path: 'SANDSTONE BEIGE', name: 'SANDSTONE BEIGE', depth: 1 },
  { path: 'BEVERLY GOLD', name: 'BEVERLY GOLD', depth: 1 },
  { path: 'BVLGARI', name: 'BVLGARI', depth: 1 },
  { path: 'AMBER JADE/CYPRUS LIGHT GREY', name: 'CYPRUS LIGHT GREY', depth: 2 },
];

const LISTING: DriveFile[] = [
  f('1', '12MM SINTERED STONES/AMBER JADE/AMBER JADE SLAB.jpg'),
  f('2', '12MM SINTERED STONES/AMBER JADE/SLAB ON STAND.jpg'),
  f('3', '12MM SINTERED STONES/AMBER JADE/APP 1.jpg'),
  f('4', '12MM SINTERED STONES/BVLGARI/STAND ON SLAB.JPG'),
  f('5', '12MM SINTERED STONES/BEVERLY GOLD/BEVERLY GOLD.jpg'),
  f('6', '12MM SINTERED STONES/BEVERLY GOLD/BEVERLY GOLD BOOKMATCH.jpg'),
  f('7', '12MM SINTERED STONES/LIMESTONE CREAMY/DSC02078.JPG'),
  f('8', '12MM SINTERED STONES/SANDSTONE BEIGE/2201632A01171.jpg'),
  f('9', '12MM SINTERED STONES/AMBER JADE/CYPRUS LIGHT GREY/APP 1.jpg'),
  f('10', '12MM SINTERED STONES/.DS_Store'),
];

describe('buildPlan against the real export defects', () => {
  const plan = buildPlan(LISTING, FOLDERS, []);
  const byId = (id: string) => plan.files.find((x) => x.driveFileId === id);

  it('resolves the standard shots', () => {
    expect(byId('1')!.role).toBe('slab');
    expect(byId('2')!.role).toBe('on_stand');
    expect(byId('3')!.role).toBe('application');
  });

  it('resolves STAND ON SLAB, matching the token set not the order', () => {
    expect(byId('4')!.role).toBe('on_stand');
  });

  it('treats a filename repeating the folder name as the slab shot', () => {
    expect(byId('5')!.role).toBe('slab');
  });

  it('resolves a product prefixed bookmatch', () => {
    expect(byId('6')!.role).toBe('bookmatch');
  });

  it('NEVER guesses: a raw camera filename is unknown and reported', () => {
    expect(byId('7')!.role).toBe('unknown');
    const issue = plan.issues.find((i) => i.path.includes('DSC02078'));
    expect(issue?.reason).toContain('does not say what it shows');
    expect(issue?.reason).toContain('Rename it');
  });

  it('flags supplier named files rather than placing them', () => {
    expect(byId('8')!.role).toBe('unknown');
    expect(plan.productsWithUnknowns).toContain('sandstone-beige');
  });

  it('EXCLUDES the misnested folder, so Amber Jade cannot get another stone’s photos', () => {
    expect(byId('9')).toBeUndefined();
    expect(plan.misnests.map((m) => m.name)).toContain('CYPRUS LIGHT GREY');
  });

  it('ignores operating system junk without reporting it as a problem', () => {
    expect(byId('10')).toBeUndefined();
    expect(plan.issues.some((i) => i.path.includes('.DS_Store'))).toBe(false);
  });

  it('names products that have no slab shot at all', () => {
    // Limestone Creamy's only candidate is DSC02078, which resolved to unknown.
    expect(plan.productsWithoutSlab).toContain('limestone-creamy');
    expect(plan.productsWithoutSlab).not.toContain('amber-jade');
  });

  it('derives slugs matching what the seed already inserted', () => {
    expect(byId('1')!.productSlug).toBe('amber-jade');
    expect(byId('1')!.categorySlug).toBe('12mm-sintered-stones');
    expect(byId('1')!.productName).toBe('Amber Jade');
  });
});

describe('buildPlan incrementality', () => {
  it('a second run downloads nothing', () => {
    const known = LISTING.filter((x) => x.id !== '9' && x.id !== '10').map((x) => ({
      driveFileId: x.id, path: x.path, md5: x.md5, role: null, productId: null,
    }));
    const plan = buildPlan(LISTING, FOLDERS, known);
    expect(plan.files.every((x) => !x.needsDownload)).toBe(true);
    expect(plan.counts.unchanged).toBeGreaterThan(0);
    expect(plan.counts.new).toBe(0);
  });

  it('a rename re resolves the role without re downloading', () => {
    const known = [{
      driveFileId: '4',
      path: '12MM SINTERED STONES/BVLGARI/SLAB ON STAND.JPG',
      md5: 'x', role: 'on_stand' as const, productId: null,
    }];
    const plan = buildPlan([LISTING[3]!], FOLDERS, known);
    expect(plan.files[0]!.outcome).toBe('moved');
    expect(plan.files[0]!.needsDownload).toBe(false);
    expect(plan.files[0]!.role).toBe('on_stand');
  });

  it('loose files in a category are reported ONCE per folder, not once per file', () => {
    // Real case: Irene uploaded 157 photographs directly into HANDLES with no
    // product folders. Reporting that 157 times buries every other problem.
    const listing = Array.from({ length: 12 }, (_, i) =>
      f(`loose-${i}`, `HANDLES/IMG_${1000 + i}.HEIC`),
    );
    const plan = buildPlan(listing, [], []);
    expect(plan.files).toHaveLength(0);
    expect(plan.looseFolders).toEqual([{ folder: 'HANDLES', count: 12 }]);
    const issue = plan.issues.find((i) => i.path === 'HANDLES');
    expect(plan.issues).toHaveLength(1);
    expect(issue?.reason).toContain('12 file(s)');
    expect(issue?.reason).toContain('one folder per product');
  });

  it('gallery and brand folders are NOT reported as errors', () => {
    // Site photos and videos legitimately have no products. Flagging them as
    // mistakes would bury the categories that genuinely need fixing.
    const plan = buildPlan([
      f('g1', 'SITE PHOTOS/IMG_2158.HEIC'),
      f('g2', 'SITE VIDEOS/clip.mov'),
      f('g3', 'BRAND IDENTITY/guideline.pdf'),
    ], [], []);
    expect(plan.issues).toHaveLength(0);
    expect(plan.looseFolders).toHaveLength(0);
    expect(plan.galleryFiles).toBe(3);
  });
});
