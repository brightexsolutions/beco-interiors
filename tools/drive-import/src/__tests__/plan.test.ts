import { describe, expect, it } from 'vitest';
import { buildPlan, photoRef } from '../plan';
import { renderReport } from '../report';
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
    expect(plan.looseFolders).toEqual([{ folder: 'HANDLES', count: 12 }]);
    const issue = plan.issues.find((i) => i.path === 'HANDLES');
    expect(plan.issues).toHaveLength(1);
    expect(issue?.reason).toContain('12 file(s)');
    expect(issue?.reason).toContain('one folder per product');
  });

  it('imports loose files in a real category as one umbrella product, on request 14 September', () => {
    // OFFICE ACCESSORIES and KITCHEN ACCESSORIES are real categories with
    // real photographs and no per-item folders. (Hinges, door locks and
    // furniture legs were too, until D122 split them by finish.) Withholding
    // them entirely, the previous behaviour, left every one of those ranges
    // with nothing to show at all. Every raw camera filename still resolves
    // to `unknown`, never guessed, exactly as it would inside a real
    // product folder: this only changes where the files land, not how a
    // role is decided.
    const listing = Array.from({ length: 5 }, (_, i) =>
      f(`oa-${i}`, `OFFICE ACCESSORIES/IMG_${4480 + i}.HEIC`),
    );
    const plan = buildPlan(listing, [], []);
    expect(plan.files).toHaveLength(5);
    expect(plan.files.every((x) => x.role === 'unknown')).toBe(true);
    expect(plan.files.every((x) => x.productSlug === 'office-accessories')).toBe(true);
    expect(plan.files.every((x) => x.categorySlug === 'office-accessories')).toBe(true);
    expect(plan.files[0]!.productName).toBe('Office Accessories');
    expect(plan.productsWithUnknowns).toContain('office-accessories');
    expect(plan.productsWithoutSlab).toContain('office-accessories');

    const issue = plan.issues.find((i) => i.path === 'OFFICE ACCESSORIES');
    expect(issue?.reason).toContain('Imported as ONE product');
    expect(issue?.reason).toContain('Office Accessories');
  });

  it('still imports nothing for a file with no category folder at all', () => {
    // A genuinely stray file at the root of the whole listing, no folder
    // above it whatsoever: there is no category to import it against, so
    // this stays skip and report only, unlike a file one level inside a
    // real category folder.
    const plan = buildPlan([f('stray', 'IMG_0001.heic')], [], []);
    expect(plan.files).toHaveLength(0);
    const issue = plan.issues.find((i) => i.path === '(root)');
    expect(issue?.reason).toContain('nothing to import this against');
    expect(issue?.reason).not.toContain('Imported as ONE product');
  });

  it('leaves a retired range alone and says so once', () => {
    // Beco stopped selling lighting (D103). The "Lights" folder of loose
    // phone photographs is still in Drive and must never become a range again.
    const listing = [
      f('l1', 'Lights/IMG_4193.HEIC'),
      f('l2', 'Lights/IMG_4189.HEIC'),
      f('l3', 'LIGHTING/PENDANT/SLAB.JPG'),
      f('s1', '12MM SINTERED STONES/BVLGARI/SLAB.JPG'),
    ];
    const plan = buildPlan(listing, [], []);
    expect(plan.files.map((x) => x.path)).toEqual(['12MM SINTERED STONES/BVLGARI/SLAB.JPG']);
    expect(plan.looseFolders).toEqual([]);
    const reasons = plan.issues.filter((i) => i.path === 'LIGHTS' || i.path === 'LIGHTING');
    expect(reasons).toHaveLength(2);
    expect(reasons.find((i) => i.path === 'LIGHTS')?.reason).toContain('2 file(s)');
    expect(reasons[0]?.reason).toContain('no longer sells');
  });

  it('reports documents once per folder and never tries to decode them', () => {
    // HANDLES/HANDLE SIZES AND PRICES holds an xlsx price list and a pdf.
    const plan = buildPlan([
      f('d1', 'HANDLES/HANDLE SIZES AND PRICES/BECO HANDLES PRICELIST.xlsx'),
      f('d2', 'HANDLES/HANDLE SIZES AND PRICES/BECO Product Prices.pdf'),
      f('d3', '12MM Sintered Stone Descriptions.docx'),
    ], [], []);
    expect(plan.files).toHaveLength(0);
    const prices = plan.issues.find((i) => i.path === 'HANDLES/HANDLE SIZES AND PRICES');
    expect(prices?.reason).toContain('2 document(s)');
    expect(prices?.reason).toContain('entered in the dashboard');
    expect(plan.issues.find((i) => i.path === '(root)')?.reason).toContain('1 document(s)');
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

describe('buildPlan against the taxonomy Beco actually keep, D104', () => {
  it('files a sub range: a folder of folders under a category', () => {
    // 12MM SINTERED STONES/HEIXIN 12MM/INK WHITE/... Heixin holds only stone
    // folders, so it is a sub range and Ink White is a product under it.
    const listing = [
      f('h1', '12MM SINTERED STONES/HEIXIN 12MM/INK WHITE/SLAB.jpg'),
      f('h2', '12MM SINTERED STONES/HEIXIN 12MM/INK WHITE/APP 1.jpg'),
      f('h3', '12MM SINTERED STONES/HEIXIN 12MM/PRADA GREEN/SLAB.jpg'),
      f('a1', '12MM SINTERED STONES/AMBER JADE/SLAB.jpg'),
    ];
    const folders: FolderNode[] = [
      { path: 'AMBER JADE', name: 'AMBER JADE', depth: 1 },
      { path: 'HEIXIN 12MM', name: 'HEIXIN 12MM', depth: 1 },
      { path: 'HEIXIN 12MM/INK WHITE', name: 'INK WHITE', depth: 2 },
      { path: 'HEIXIN 12MM/PRADA GREEN', name: 'PRADA GREEN', depth: 2 },
    ];
    const plan = buildPlan(listing, folders, []);
    expect(plan.misnests).toEqual([]);
    const ink = plan.files.find((x) => x.driveFileId === 'h1')!;
    expect(ink.productSlug).toBe('ink-white');
    expect(ink.productName).toBe('Ink White');
    expect(ink.role).toBe('slab');
    expect(ink.categoryPath).toBe('12MM SINTERED STONES/HEIXIN 12MM');
    expect(ink.categorySlug).toBe('heixin-12mm');
    expect(ink.categoryChain.map((c) => c.path)).toEqual(['12MM SINTERED STONES', '12MM SINTERED STONES/HEIXIN 12MM']);
    expect(ink.categoryChain[1]!.name).toBe('Heixin 12mm');
    const amber = plan.files.find((x) => x.driveFileId === 'a1')!;
    expect(amber.categoryChain.map((c) => c.path)).toEqual(['12MM SINTERED STONES']);
  });

  it('still skips a folder nested inside a product folder', () => {
    // AMBER JADE holds photographs itself, so a folder inside it is a misnest.
    const listing = [
      f('a1', '12MM SINTERED STONES/AMBER JADE/SLAB.jpg'),
      f('a2', '12MM SINTERED STONES/AMBER JADE/CYPRUS LIGHT GREY/SLAB.jpg'),
    ];
    const folders: FolderNode[] = [
      { path: 'AMBER JADE', name: 'AMBER JADE', depth: 1 },
      { path: 'AMBER JADE/CYPRUS LIGHT GREY', name: 'CYPRUS LIGHT GREY', depth: 2 },
    ];
    const plan = buildPlan(listing, folders, []);
    expect(plan.files.map((x) => x.driveFileId)).toEqual(['a1']);
    expect(plan.misnests.map((m) => m.path)).toEqual(['AMBER JADE/CYPRUS LIGHT GREY']);
  });

  it('makes one product per photograph when every file in a folder names its own item', () => {
    // HANDLES/BLACK HANDLES as Beco uploaded it: each file is a handle.
    const listing = [
      f('b1', 'HANDLES/BLACK HANDLES/B762 BLACK.HEIC'),
      f('b2', 'HANDLES/BLACK HANDLES/HT-8350 BLACK GOLD.HEIC'),
      f('b3', 'HANDLES/BLACK HANDLES/HT-8350 GOLD BLACK 2.HEIC'),
      f('b4', 'HANDLES/BLACK HANDLES/HT-8350 NICKEL BRUSHED BROWN.HEIC'),
      f('b5', 'HANDLES/BLACK HANDLES/HT-8350 NICKEL BRUSHED BROWN 2.HEIC'),
    ];
    const plan = buildPlan(listing, [{ path: 'BLACK HANDLES', name: 'BLACK HANDLES', depth: 1 }], []);
    expect(plan.files).toHaveLength(5);
    const slugs = new Set(plan.files.map((x) => x.productSlug));
    expect(slugs).toEqual(new Set(['b762-black', 'ht-8350-black-gold', 'ht-8350-nickel-brushed-brown']));
    // "GOLD BLACK 2" is the same words as "BLACK GOLD" in another order, so
    // it is the second photograph of that handle, not a second handle.
    expect(plan.files.find((x) => x.driveFileId === 'b3')!.productSlug).toBe('ht-8350-black-gold');
    expect(plan.files.find((x) => x.driveFileId === 'b3')!.role).toBe('application');
    const b2 = plan.files.find((x) => x.driveFileId === 'b2')!;
    expect(b2.productName).toBe('HT-8350 Black Gold');
    expect(b2.productPath).toBe('HANDLES/BLACK HANDLES/HT-8350 BLACK GOLD');
    expect(b2.categoryChain.map((c) => c.slug)).toEqual(['handles', 'black-handles']);
    expect(b2.categorySlug).toBe('black-handles');
    expect(b2.role).toBe('slab');
    // The second photograph of the same item joins its gallery.
    const brown = plan.files.filter((x) => x.productSlug === 'ht-8350-nickel-brushed-brown');
    expect(brown.map((x) => x.role)).toEqual(['slab', 'application']);
    expect(plan.productsWithoutSlab).toEqual([]);
    expect(plan.productsWithUnknowns).toEqual([]);
    expect(plan.itemFolders).toEqual([{ folder: 'HANDLES/BLACK HANDLES', items: 3, files: 5 }]);
    const issue = plan.issues.find((i) => i.path === 'HANDLES/BLACK HANDLES');
    expect(issue?.reason).toContain('5 file(s) were imported as 3 product(s)');
    expect(plan.looseFolders).toEqual([]);
  });

  it('keeps a stone folder of supplier coded files as ONE product, with its unknowns reported', () => {
    const listing = [
      f('s1', '12MM SINTERED STONES/SANDSTONE BEIGE/2201632A01171.jpg'),
      f('s2', '12MM SINTERED STONES/SANDSTONE BEIGE/Sandstone Beige 2201632A01171.jpg'),
    ];
    const plan = buildPlan(listing, [], []);
    expect(new Set(plan.files.map((x) => x.productSlug))).toEqual(new Set(['sandstone-beige']));
    expect(plan.productsWithUnknowns).toContain('sandstone-beige');
    expect(plan.itemFolders).toEqual([]);
  });

  it('keeps a folder of camera named files as ONE umbrella product', () => {
    // Was 15MM SINTERED STONES until 6 October, which now splits per
    // photograph. Any range outside the split lists keeps the old rule.
    const listing = [
      f('c1', 'SPC FLOORING/IMG_4197.heic'),
      f('c2', 'SPC FLOORING/IMG_4200.heic'),
    ];
    const plan = buildPlan(listing, [], []);
    expect(plan.files.every((x) => x.productSlug === 'spc-flooring')).toBe(true);
    expect(plan.itemFolders).toEqual([]);
    expect(plan.photoFolders).toEqual([]);
  });

  /**
   * 15MM SINTERED STONES as it is in Drive on 6 October: five phone
   * photographs of different stones, no subfolders. Brown: one bundled
   * product showing several stones is wrong. Split one per photograph like
   * the hinges, but filed in the range itself, with no finish sorting.
   */
  describe('15mm stones, one product per photograph', () => {
    const stones = ['IMG_4197.heic', 'IMG_4198.heic', 'IMG_4199.heic', 'IMG_4200.heic', 'IMG_4202.heic']
      .map((name, i) => f(`m${i}`, `15MM SINTERED STONES/${name}`));
    const plan = buildPlan(stones, [], []);

    it('makes each photograph its own product, named after its photo number', () => {
      expect(plan.files.map((x) => [x.productSlug, x.productName, x.role])).toEqual([
        ['15mm-sintered-stone-4197', '15mm Sintered Stone 4197', 'slab'],
        ['15mm-sintered-stone-4198', '15mm Sintered Stone 4198', 'slab'],
        ['15mm-sintered-stone-4199', '15mm Sintered Stone 4199', 'slab'],
        ['15mm-sintered-stone-4200', '15mm Sintered Stone 4200', 'slab'],
        ['15mm-sintered-stone-4202', '15mm Sintered Stone 4202', 'slab'],
      ]);
    });

    it('files every one in the range itself, never a colour sub range', () => {
      for (const x of plan.files) {
        expect(x.categoryPath).toBe('15MM SINTERED STONES');
        expect(x.categoryChain.map((c) => c.slug)).toEqual(['15mm-sintered-stones']);
        expect(x.splitByFinish).toBeUndefined();
      }
      expect(plan.finishFolders).toEqual([]);
    });

    it('keeps each on its own Drive path and gives it the same slug every run', () => {
      expect(plan.files[0]!.productPath).toBe('15MM SINTERED STONES/IMG_4197');
      const known = stones.map((s) => ({ driveFileId: s.id, path: s.path, md5: s.md5 ?? null, role: null, productId: null }));
      const again = buildPlan(stones, [], known);
      expect(again.files.map((x) => x.productSlug)).toEqual(plan.files.map((x) => x.productSlug));
      expect(again.files.every((x) => !x.needsDownload)).toBe(true);
    });

    it('drops the umbrella product and tells Beco to name each photograph after its stone', () => {
      expect(plan.files.some((x) => x.productSlug === '15mm-sintered-stones')).toBe(false);
      expect(plan.photoFolders).toEqual([{ folder: '15MM SINTERED STONES', count: 5 }]);
      expect(plan.looseFolders).toEqual([]);
      const issue = plan.issues.find((i) => i.path === '15MM SINTERED STONES')!;
      expect(issue.reason).toContain('Rename each photograph in Drive after the stone it shows');
      expect(issue.reason).toContain('"15mm Sintered Stone 4197"');
      expect(issue.reason).toContain('unpublished');
    });

    it('lists the folder in the run report under its own heading', () => {
      const report = renderReport(plan);
      expect(report).toContain('RANGES SPLIT ONE PRODUCT PER PHOTOGRAPH\n');
      expect(report).toContain('   5 product(s)  15MM SINTERED STONES');
      expect(report).not.toContain('SORTED BY FINISH');
    });

    it('hands over to the item rule once the photographs are named after their stones', () => {
      const named = buildPlan([
        f('n1', '15MM SINTERED STONES/CALACATTA VIOLA.heic'),
        f('n2', '15MM SINTERED STONES/PIETRA GREY.heic'),
      ], [], []);
      expect(named.files.map((x) => [x.productName, x.productSlug, x.categoryPath])).toEqual([
        ['Calacatta Viola', 'calacatta-viola', '15MM SINTERED STONES'],
        ['Pietra Grey', 'pietra-grey', '15MM SINTERED STONES'],
      ]);
      expect(named.photoFolders).toEqual([]);
      expect(named.itemFolders).toEqual([{ folder: '15MM SINTERED STONES', items: 2, files: 2 }]);
    });

    it('leaves a 15mm stone in its own product folder exactly as before', () => {
      const foldered = buildPlan([f('p1', '15MM SINTERED STONES/PIETRA GREY/SLAB.jpg')], [], []);
      expect(foldered.files[0]!.productSlug).toBe('pietra-grey');
      expect(foldered.photoFolders).toEqual([]);
    });
  });

  it('gives two items with the same name in different folders two products', () => {
    const listing = [
      f('k1', 'HANDLES/BLACK HANDLES/B100 BLACK.HEIC'),
      f('k2', 'HANDLES/BLACK HANDLES/B200 BLACK.HEIC'),
      f('k3', 'HANDLES/KNOBS/B100 BLACK.HEIC'),
      f('k4', 'HANDLES/KNOBS/K7 BRASS.HEIC'),
    ];
    const plan = buildPlan(listing, [], []);
    const slugs = plan.files.map((x) => x.productSlug);
    expect(slugs).toContain('b100-black');
    expect(slugs).toContain('knobs-b100-black');
  });

  it('skips and reports anything more than two folders below a range', () => {
    const listing = [f('x1', 'HANDLES/BLACK HANDLES/PULLS/H1/SLAB.jpg')];
    const plan = buildPlan(listing, [], []);
    expect(plan.files).toEqual([]);
    const issue = plan.issues.find((i) => i.path === 'HANDLES/BLACK HANDLES/PULLS/H1');
    expect(issue?.reason).toContain('more than two folders below a range');
  });
});

describe('ranges split by finish, D122', () => {
  // HINGES as it is in Drive on 5 October: phone photographs, nothing named.
  const hinges = [
    f('h1', 'HINGES/IMG_1193.HEIC'),
    f('h2', 'HINGES/IMG_1215.HEIC'),
    f('h3', 'HINGES/BF8BC386-1505-4521-97FF-7FB9A96DC2A9.jpg'),
  ];

  it('makes each loose photograph its own product, named after its photo number', () => {
    const plan = buildPlan(hinges, [], []);
    expect(plan.files.map((x) => [x.productSlug, x.productName, x.productPath])).toEqual([
      ['hinge-1193', 'Hinge 1193', 'HINGES/IMG_1193'],
      ['hinge-1215', 'Hinge 1215', 'HINGES/IMG_1215'],
      ['hinge-bf8bc386', 'Hinge bf8bc386', 'HINGES/BF8BC386-1505-4521-97FF-7FB9A96DC2A9'],
    ]);
  });

  it('files each under the range for now, as its own shot, marked for the run to read the finish', () => {
    const plan = buildPlan(hinges, [], []);
    for (const file of plan.files) {
      expect(file.categoryPath).toBe('HINGES');
      expect(file.categoryChain.map((c) => c.slug)).toEqual(['hinges']);
      expect(file.role).toBe('slab');
      expect(file.splitByFinish).toMatchObject({ folder: 'HINGES', noun: 'Hinge' });
    }
    expect(plan.productsWithoutSlab).toEqual([]);
    expect(plan.productsWithUnknowns).toEqual([]);
  });

  it('reports the split once, and no longer as one umbrella product', () => {
    const plan = buildPlan(hinges, [], []);
    expect(plan.finishFolders).toEqual([{ folder: 'HINGES', count: 3 }]);
    expect(plan.looseFolders).toEqual([]);
    const issues = plan.issues.filter((i) => i.path === 'HINGES');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toContain('own product');
    expect(issues[0]!.reason).toContain('unpublished');
    expect(plan.files.some((x) => x.productSlug === 'hinges')).toBe(false);
  });

  it('still lets names win: a hinge folder whose files name each item splits by name, not finish', () => {
    const plan = buildPlan([f('n1', 'HINGES/H-301 SOFT CLOSE.jpg'), f('n2', 'HINGES/H-302 FULL OVERLAY.jpg')], [], []);
    expect(plan.files.map((x) => x.productName)).toEqual(['H-301 Soft Close', 'H-302 Full Overlay']);
    expect(plan.files.every((x) => !x.splitByFinish)).toBe(true);
    expect(plan.finishFolders).toEqual([]);
  });

  it('splits door locks and furniture legs the same way, each under its own name', () => {
    const plan = buildPlan([
      f('d1', 'DOOR LOCKS/IMG_5692.HEIC'),
      f('l1', 'FURNITURE LEGS/IMG_4517.HEIC'),
      f('l2', 'FURNITURE LEGS/IMG_4518.HEIC'),
    ], [], []);
    expect(plan.files.map((x) => [x.productSlug, x.productName, x.categoryPath])).toEqual([
      ['door-lock-5692', 'Door Lock 5692', 'DOOR LOCKS'],
      ['furniture-leg-4517', 'Furniture Leg 4517', 'FURNITURE LEGS'],
      ['furniture-leg-4518', 'Furniture Leg 4518', 'FURNITURE LEGS'],
    ]);
    expect(plan.finishFolders).toEqual([{ folder: 'DOOR LOCKS', count: 1 }, { folder: 'FURNITURE LEGS', count: 2 }]);
    const legs = plan.issues.find((i) => i.path === 'FURNITURE LEGS')!;
    expect(legs.reason).toContain('"Furniture Leg 4517"');
  });

  it('leaves every other loose range as one umbrella product, as before', () => {
    const plan = buildPlan([f('l1', 'KITCHEN ACCESSORIES/IMG_1.HEIC'), f('l2', 'KITCHEN ACCESSORIES/IMG_2.HEIC')], [], []);
    expect(new Set(plan.files.map((x) => x.productSlug))).toEqual(new Set(['kitchen-accessories']));
    expect(plan.finishFolders).toEqual([]);
  });

  it('keeps a product folder inside the range as one product', () => {
    const plan = buildPlan([f('p1', 'HINGES/SOFT CLOSE/IMG_1.HEIC'), f('p2', 'HINGES/SOFT CLOSE/IMG_2.HEIC')], [], []);
    expect(new Set(plan.files.map((x) => x.productSlug))).toEqual(new Set(['soft-close']));
    expect(plan.files.every((x) => !x.splitByFinish)).toBe(true);
  });

  it('gives an unchanged photograph the same slug on every run', () => {
    const first = buildPlan(hinges, [], []);
    const known = hinges.map((h) => ({ driveFileId: h.id, path: h.path, md5: h.md5 ?? null, role: null, productId: null }));
    const second = buildPlan(hinges, [], known);
    expect(second.files.map((x) => x.productSlug)).toEqual(first.files.map((x) => x.productSlug));
    expect(second.files.every((x) => !x.needsDownload)).toBe(true);
  });
});

describe('photoRef', () => {
  it('takes the number a phone gave the photograph', () => {
    expect(photoRef('IMG_1193.HEIC')).toBe('1193');
    expect(photoRef('PXL_20260831_092311.jpg')).toBe('092311');
    expect(photoRef('IMG_1193 2.HEIC')).toBe('1193');
  });

  it('takes the start of a random name, lowercased', () => {
    expect(photoRef('BF8BC386-1505-4521-97FF-7FB9A96DC2A9.jpg')).toBe('bf8bc386');
  });
});
