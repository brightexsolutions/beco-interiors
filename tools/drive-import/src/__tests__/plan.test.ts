import { describe, expect, it } from 'vitest';
import { buildPlan, exportItemName, exportRef, isExportName, isPerPhotoRange, photoRef, singularNoun } from '../plan';
import { umbrellaRetirements } from '../run';
import { renderReport } from '../report';
import type { DriveFile } from '../classify';
import type { FolderNode } from '../misnest';

/**
 * Fixtures reproducing EVERY defect actually found in the 29 August export.
 * A future change to the pipeline cannot silently start guessing without
 * failing here.
 */
const f = (id: string, path: string, md5 = `md5-${id}`): DriveFile => ({
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
      md5: 'md5-4', role: 'on_stand' as const, productId: null,
    }];
    const plan = buildPlan([LISTING[3]!], FOLDERS, known);
    expect(plan.files[0]!.outcome).toBe('moved');
    expect(plan.files[0]!.needsDownload).toBe(false);
    expect(plan.files[0]!.role).toBe('on_stand');
  });

  it('loose files in a category are reported ONCE per folder, not once per file', () => {
    // Real case: Irene uploaded 157 photographs directly into HANDLES with no
    // product folders. Reporting that 157 times buries every other problem.
    // One named file keeps it an umbrella: a range of nothing but phone
    // names splits per photograph since 7 October.
    const listing = [
      ...Array.from({ length: 11 }, (_, i) => f(`loose-${i}`, `HANDLES/IMG_${1000 + i}.HEIC`)),
      f('loose-named', 'HANDLES/ASSORTED.HEIC'),
    ];
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
    //
    // Since 7 October a range of nothing but phone photographs splits one
    // product per photograph, so the umbrella is what is left for a loose
    // folder that also holds a named file and is not an item folder.
    const listing = [
      ...Array.from({ length: 4 }, (_, i) => f(`oa-${i}`, `SPC FLOORING/IMG_${4480 + i}.HEIC`)),
      f('oa-named', 'SPC FLOORING/SHOWROOM.HEIC'),
    ];
    const plan = buildPlan(listing, [], []);
    expect(plan.files).toHaveLength(5);
    expect(plan.files.every((x) => x.role === 'unknown')).toBe(true);
    expect(plan.files.every((x) => x.productSlug === 'spc-flooring')).toBe(true);
    expect(plan.files.every((x) => x.categorySlug === 'spc-flooring')).toBe(true);
    expect(plan.files[0]!.productName).toBe('Spc Flooring');
    expect(plan.productsWithUnknowns).toContain('spc-flooring');
    expect(plan.productsWithoutSlab).toContain('spc-flooring');
    expect(plan.photoFolders).toEqual([]);

    const issue = plan.issues.find((i) => i.path === 'SPC FLOORING');
    expect(issue?.reason).toContain('Imported as ONE product');
    expect(issue?.reason).toContain('Spc Flooring');
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

  it('keeps a range holding a single loose phone photograph as ONE product', () => {
    // A range of two or more phone photographs splits per photograph since
    // 7 October. One photograph is one product either way, named after its
    // range rather than a photo number.
    const plan = buildPlan([f('c1', 'SPC FLOORING/IMG_4197.heic')], [], []);
    expect(plan.files.map((x) => x.productSlug)).toEqual(['spc-flooring']);
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
      expect(issue.reason).toContain("Set each stone's name in the dashboard catalogue");
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

  it('never sorts a range outside the list by finish, even when it splits per photograph', () => {
    const plan = buildPlan([f('l1', 'KITCHEN ACCESSORIES/IMG_1001.HEIC'), f('l2', 'KITCHEN ACCESSORIES/IMG_1002.HEIC')], [], []);
    expect(plan.files.map((x) => x.productSlug)).toEqual(['kitchen-accessory-1001', 'kitchen-accessory-1002']);
    expect(plan.files.every((x) => !x.splitByFinish)).toBe(true);
    expect(plan.finishFolders).toEqual([]);
    expect(plan.photoFolders).toEqual([{ folder: 'KITCHEN ACCESSORIES', count: 2 }]);
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

/**
 * 6 October: a gold handle was published as
 * "34D00DD2-442A-4748-BF08-86C2643EE870", its iPhone export filename. An
 * export or phone name is never a product name; it gets a readable
 * placeholder for Beco to rename in the dashboard. Names typed by Beco are
 * left exactly as typed. The listing is the real GOLD HANDLES and KNOBS
 * folders, cut down, plus phone names for the other export shapes.
 */
describe('export named items in an item folder', () => {
  const handles = [
    f('g1', 'HANDLES/GOLD HANDLES/34D00DD2-442A-4748-BF08-86C2643EE870.jpg'),
    f('g2', 'HANDLES/GOLD HANDLES/537 GOLD'),
    f('g3', 'HANDLES/GOLD HANDLES/A7355 K GOLD'),
    f('g4', 'HANDLES/GOLD HANDLES/IMG_4410.HEIC'),
    f('g5', 'HANDLES/GOLD HANDLES/A7782 WHITE GOLD'),
    f('k1', 'HANDLES/KNOBS/HT-8355 K GOLD KNOB'),
    f('k2', 'HANDLES/KNOBS/A36 BLACK KNOB'),
    f('k3', 'HANDLES/KNOBS/PXL_20260831_092311.jpg'),
  ];
  const plan = buildPlan(handles, [], []);
  const by = (id: string) => plan.files.find((x) => x.driveFileId === id)!;

  it('gives a UUID or phone named handle a placeholder of finish, noun and short reference', () => {
    expect(by('g1').productName).toBe('Gold Handle 34D0');
    expect(by('g1').productSlug).toBe('gold-handle-34d0');
    expect(by('g4').productName).toBe('Gold Handle 4410');
    // Knobs names no finish, so none is invented.
    expect(by('k3').productName).toBe('Knob 092311');
  });

  it('keeps the export named item on its own Drive path, so an existing row is still found', () => {
    expect(by('g1').productPath).toBe('HANDLES/GOLD HANDLES/34D00DD2-442A-4748-BF08-86C2643EE870');
  });

  it('gives the placeholder the same slug on every run', () => {
    const known = handles.map((h) => ({ driveFileId: h.id, path: h.path, md5: h.md5 ?? null, role: null, productId: null }));
    const again = buildPlan(handles, [], known);
    expect(again.files.map((x) => x.productSlug)).toEqual(plan.files.map((x) => x.productSlug));
  });

  it('leaves names Beco typed exactly as before, name and slug', () => {
    expect(by('g2').productName).toBe('537 Gold');
    expect(by('g2').productSlug).toBe('537-gold');
    expect(by('g3').productName).toBe('A7355 K Gold');
    expect(by('k1').productName).toBe('HT-8355 K Gold Knob');
  });

  it('still makes the folder an item folder with export names in it', () => {
    expect(plan.itemFolders).toContainEqual({ folder: 'HANDLES/GOLD HANDLES', items: 5, files: 5 });
  });

  it('never makes a folder of nothing but export names an item folder', () => {
    const loose = buildPlan([
      f('u1', 'HANDLES/GOLD HANDLES/34D00DD2-442A-4748-BF08-86C2643EE870.jpg'),
      f('u2', 'HANDLES/GOLD HANDLES/IMG_4410.HEIC'),
    ], [], []);
    expect(loose.itemFolders).toEqual([]);
  });

  it('names a phone photograph in an item folder outside HANDLES by its folder, once', () => {
    const hinges = buildPlan([
      f('h1', 'HINGES/H-301 SOFT CLOSE.jpg'),
      f('h2', 'HINGES/H-302 FULL OVERLAY.jpg'),
      f('h3', 'HINGES/IMG_1193.HEIC'),
    ], [], []);
    expect(hinges.files.map((x) => x.productName)).toEqual(['H-301 Soft Close', 'H-302 Full Overlay', 'Hinges 1193']);
  });
});

describe('isExportName and exportRef', () => {
  it.each([
    'IMG_1234.HEIC', 'PXL_20260831_092311.jpg', 'DSC02078.JPG',
    '34D00DD2-442A-4748-BF08-86C2643EE870.jpg', '1F5DC2CDE1F147B1', '20260512093011',
  ])('reads %s as an export name', (name) => expect(isExportName(name)).toBe(true));

  it.each(['B762 BLACK', 'HT-8350 BLACK GOLD', '8084', 'A7355', 'ASSORTMENT', 'DEADBEEF'])(
    'reads %s as a real item name',
    (name) => expect(isExportName(name)).toBe(false),
  );

  it('shortens a UUID to its first four characters, uppercase', () => {
    expect(exportRef('34d00dd2-442a-4748-bf08-86c2643ee870.jpg')).toBe('34D0');
    expect(exportRef('IMG_1234.HEIC')).toBe('1234');
  });

  it('builds the placeholder from the folder, with the noun only where ITEM_NOUNS gives one', () => {
    expect(exportItemName('GOLD HANDLES', 'Handle', '34D0')).toBe('Gold Handle 34D0');
    expect(exportItemName('HINGES', undefined, '1234')).toBe('Hinges 1234');
  });
});

/**
 * Brown, 7 October: Bamboo Veneer Wall Panels was one product with 31
 * photographs of different panels. Six ranges in Drive were in that state,
 * every file a phone name, no subfolders. The listing below is each folder
 * as it is in Drive on 7 October, cut down, with the real filenames.
 */
describe('ranges of phone photographs split one product per photograph, 7 October', () => {
  const six = [
    f('bv1', 'BAMBOO VENEER WALL PANELS/IMG_4580.HEIC'),
    f('bv2', 'BAMBOO VENEER WALL PANELS/IMG_5109.HEIC'),
    f('ka1', 'KITCHEN ACCESSORIES/IMG_1011.HEIC'),
    f('ka2', 'KITCHEN ACCESSORIES/IMG_4147.heic'),
    f('oa1', 'OFFICE ACCESSORIES/IMG_0996.HEIC'),
    f('oa2', 'OFFICE ACCESSORIES/IMG_5695.HEIC'),
    f('fs1', 'FLOATING SHELF ACCESSORIES/IMG_1033.HEIC'),
    f('fs2', 'FLOATING SHELF ACCESSORIES/IMG_1098.HEIC'),
    f('dr1', 'Drawer rails/IMG_4160.heic'),
    f('dr2', 'Drawer rails/IMG_4170.HEIC'),
    f('fw1', 'FLUTED WALL PANELS/IMG_4535.HEIC'),
    f('fw2', 'FLUTED WALL PANELS/IMG_4604.HEIC'),
  ];
  const plan = buildPlan(six, [], []);

  it('makes each photograph its own product with a readable placeholder name', () => {
    expect(plan.files.map((x) => [x.productName, x.productSlug])).toEqual([
      ['Bamboo Veneer Wall Panel 4580', 'bamboo-veneer-wall-panel-4580'],
      ['Bamboo Veneer Wall Panel 5109', 'bamboo-veneer-wall-panel-5109'],
      ['Kitchen Accessory 1011', 'kitchen-accessory-1011'],
      ['Kitchen Accessory 4147', 'kitchen-accessory-4147'],
      ['Office Accessory 0996', 'office-accessory-0996'],
      ['Office Accessory 5695', 'office-accessory-5695'],
      ['Floating Shelf Accessory 1033', 'floating-shelf-accessory-1033'],
      ['Floating Shelf Accessory 1098', 'floating-shelf-accessory-1098'],
      ['Drawer Rail 4160', 'drawer-rail-4160'],
      ['Drawer Rail 4170', 'drawer-rail-4170'],
      ['Fluted Wall Panel 4535', 'fluted-wall-panel-4535'],
      ['Fluted Wall Panel 4604', 'fluted-wall-panel-4604'],
    ]);
  });

  it('files each directly in its own range, as its own shot, with no finish sorting', () => {
    for (const x of plan.files) {
      const range = x.path.split('/')[0]!;
      expect(x.categoryPath).toBe(range);
      expect(x.categoryChain.map((c) => c.path)).toEqual([range]);
      expect(x.productPath).toBe(x.path.replace(/\.[^.]+$/, ''));
      expect(x.role).toBe('slab');
      expect(x.splitByFinish).toBeUndefined();
    }
    expect(plan.finishFolders).toEqual([]);
    expect(plan.looseFolders).toEqual([]);
    expect(plan.productsWithoutSlab).toEqual([]);
    expect(plan.productsWithUnknowns).toEqual([]);
  });

  it('reports each range once and marks its old umbrella product for unpublishing', () => {
    expect(plan.photoFolders.map((p) => p.folder).sort()).toEqual([
      'BAMBOO VENEER WALL PANELS', 'Drawer rails', 'FLOATING SHELF ACCESSORIES',
      'FLUTED WALL PANELS', 'KITCHEN ACCESSORIES', 'OFFICE ACCESSORIES',
    ]);
    const bamboo = plan.issues.filter((i) => i.path === 'BAMBOO VENEER WALL PANELS');
    expect(bamboo).toHaveLength(1);
    expect(bamboo[0]!.reason).toContain('"Bamboo Veneer Wall Panel 4580"');
    expect(bamboo[0]!.reason).toContain("Set each panel's name in the dashboard catalogue");
    expect(bamboo[0]!.reason).toContain('"Bamboo Veneer Wall Panels" product is unpublished');
    expect(umbrellaRetirements(plan).filter((r) => r.replacedBy === 'photograph').map((r) => r.folder).sort())
      .toEqual(plan.photoFolders.map((p) => p.folder).sort());
  });

  it('gives every photograph the same slug on a second run and downloads nothing', () => {
    const known = six.map((s) => ({ driveFileId: s.id, path: s.path, md5: s.md5, role: null, productId: null }));
    const again = buildPlan(six, [], known);
    expect(again.files.map((x) => x.productSlug)).toEqual(plan.files.map((x) => x.productSlug));
    expect(again.files.every((x) => !x.needsDownload)).toBe(true);
  });

  it('leaves the 15mm stones named as before, through the list', () => {
    const stones = buildPlan([f('m1', '15MM SINTERED STONES/IMG_4197.heic'), f('m2', '15MM SINTERED STONES/IMG_4198.heic')], [], []);
    expect(stones.files.map((x) => x.productName)).toEqual(['15mm Sintered Stone 4197', '15mm Sintered Stone 4198']);
  });

  it('keeps hinges, locks and legs on the finish path, never split twice', () => {
    const hw = buildPlan([f('h1', 'HINGES/IMG_1193.HEIC'), f('h2', 'HINGES/IMG_1194.HEIC')], [], []);
    expect(hw.finishFolders).toEqual([{ folder: 'HINGES', count: 2 }]);
    expect(hw.photoFolders).toEqual([]);
  });

  it('keeps a range with a named file in it as one umbrella, never guessing', () => {
    const mixed = buildPlan([
      f('x1', 'OFFICE ACCESSORIES/IMG_0996.HEIC'),
      f('x2', 'OFFICE ACCESSORIES/IMG_1007.HEIC'),
      f('x3', 'OFFICE ACCESSORIES/DESK ORGANISER.HEIC'),
    ], [], []);
    expect(new Set(mixed.files.map((x) => x.productSlug))).toEqual(new Set(['office-accessories']));
    expect(mixed.photoFolders).toEqual([]);
  });

  it('lists the ranges in the run report', () => {
    const report = renderReport(plan);
    expect(report).toContain('   2 product(s)  BAMBOO VENEER WALL PANELS');
    expect(report).toContain('   2 product(s)  Drawer rails');
  });
});

/**
 * KITCHEN ACCESSORIES in Drive holds every Drawer rails photograph again:
 * the same bytes (same md5) under a different Drive id, uploaded on 22
 * September, a day before Beco made the Drawer rails folder, and some of
 * them two or three times over. One photograph must be one product.
 */
describe('one photograph is one product, however many copies Drive holds', () => {
  const listing = [
    f('k-own', 'KITCHEN ACCESSORIES/IMG_1011.HEIC', 'md5-sink'),
    f('k-own-2', 'KITCHEN ACCESSORIES/IMG_1046.HEIC', 'md5-tap'),
    f('k-4160-a', 'KITCHEN ACCESSORIES/IMG_4160.heic', 'md5-4160'),
    f('k-4160-b', 'KITCHEN ACCESSORIES/IMG_4160.heic', 'md5-4160'),
    f('k-4160-c', 'KITCHEN ACCESSORIES/IMG_4160.heic', 'md5-4160'),
    f('k-4170', 'KITCHEN ACCESSORIES/IMG_4170.HEIC', 'md5-4170'),
    f('d-4160', 'Drawer rails/IMG_4160.heic', 'md5-4160'),
    f('d-4170', 'Drawer rails/IMG_4170.HEIC', 'md5-4170'),
  ];
  const plan = buildPlan(listing, [], []);

  it('keeps each drawer rail once, in Drawer rails, the narrower range', () => {
    expect(plan.files.map((x) => [x.driveFileId, x.productSlug, x.categoryPath])).toEqual([
      ['k-own', 'kitchen-accessory-1011', 'KITCHEN ACCESSORIES'],
      ['k-own-2', 'kitchen-accessory-1046', 'KITCHEN ACCESSORIES'],
      ['d-4160', 'drawer-rail-4160', 'Drawer rails'],
      ['d-4170', 'drawer-rail-4170', 'Drawer rails'],
    ]);
    const slugs = plan.files.map((x) => x.productSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('reports the copies once per folder, saying where each photograph was kept', () => {
    expect(plan.copies).toEqual([{ folder: 'KITCHEN ACCESSORIES', keptIn: 'Drawer rails', count: 4 }]);
    expect(plan.photoFolders).toEqual([
      { folder: 'KITCHEN ACCESSORIES', count: 2 },
      { folder: 'Drawer rails', count: 2 },
    ]);
    const issue = plan.issues.find((i) => i.reason.includes('exact copies'))!;
    expect(issue.path).toBe('KITCHEN ACCESSORIES');
    expect(issue.reason).toContain('4 photograph(s) in "KITCHEN ACCESSORIES" are exact copies of photographs in "Drawer rails"');
    expect(renderReport(plan)).toContain('COPIES OF ONE PHOTOGRAPH, IMPORTED ONCE');
  });

  it('chooses the same copy whatever order Drive lists them in', () => {
    const reversed = buildPlan([...listing].reverse(), [], []);
    expect(reversed.files.map((x) => x.driveFileId).sort()).toEqual(plan.files.map((x) => x.driveFileId).sort());
  });

  it('keeps one of several copies inside a single folder, the lowest id', () => {
    const one = buildPlan([
      f('z', 'KITCHEN ACCESSORIES/IMG_4160.heic', 'md5-4160'),
      f('a', 'KITCHEN ACCESSORIES/IMG_4160.heic', 'md5-4160'),
      f('m', 'KITCHEN ACCESSORIES/IMG_4161.heic', 'md5-4161'),
    ], [], []);
    expect(one.files.map((x) => [x.driveFileId, x.productSlug])).toEqual([
      ['a', 'kitchen-accessory-4160'],
      ['m', 'kitchen-accessory-4161'],
    ]);
    expect(one.copies).toEqual([{ folder: 'KITCHEN ACCESSORIES', keptIn: 'KITCHEN ACCESSORIES', count: 1 }]);
    expect(one.issues.find((i) => i.reason.includes('exact copies'))!.reason).toContain('in the same folder');
  });

  it('dedupes across a finish range and a per photograph range too', () => {
    const hw = buildPlan([
      f('l1', 'DOOR LOCKS/IMG_5687.HEIC', 'md5-lock'),
      f('o1', 'OFFICE ACCESSORIES/IMG_5687.HEIC', 'md5-lock'),
      f('o2', 'OFFICE ACCESSORIES/IMG_0996.HEIC', 'md5-tray'),
    ], [], []);
    expect(hw.files.map((x) => x.productSlug)).toEqual(['door-lock-5687', 'office-accessory-0996']);
  });

  it('never dedupes the photographs of a stone product', () => {
    // A stone folder is one product with several shots; an application shot
    // reused in two stones' folders still belongs to both.
    const stones = buildPlan([
      f('s1', '12MM SINTERED STONES/AMBER JADE/APP 1.jpg', 'md5-kitchen'),
      f('s2', '12MM SINTERED STONES/CYPRUS LIGHT GREY/APP 1.jpg', 'md5-kitchen'),
    ], [], []);
    expect(stones.files.map((x) => x.productSlug)).toEqual(['amber-jade', 'cyprus-light-grey']);
    expect(stones.copies).toEqual([]);
  });
});

describe('a folder of phone photographs nested inside a range', () => {
  it('becomes a sub range of the range, one product per photograph, when the range itself splits', () => {
    const plan = buildPlan([
      f('k1', 'KITCHEN ACCESSORIES/IMG_1011.HEIC'),
      f('k2', 'KITCHEN ACCESSORIES/IMG_1046.HEIC'),
      f('n1', 'KITCHEN ACCESSORIES/DRAWER RAILS/IMG_4160.heic'),
      f('n2', 'KITCHEN ACCESSORIES/DRAWER RAILS/IMG_4161.heic'),
    ], [{ path: 'DRAWER RAILS', name: 'DRAWER RAILS', depth: 1 }], []);
    const rail = plan.files.find((x) => x.driveFileId === 'n1')!;
    expect(rail.productName).toBe('Drawer Rail 4160');
    // The same slug as the photograph in a top level Drawer rails folder, so
    // moving the folder in Drive does not make a second product.
    expect(rail.productSlug).toBe('drawer-rail-4160');
    expect(rail.productPath).toBe('KITCHEN ACCESSORIES/DRAWER RAILS/IMG_4160');
    expect(rail.categoryPath).toBe('KITCHEN ACCESSORIES/DRAWER RAILS');
    expect(rail.categoryChain.map((c) => c.slug)).toEqual(['kitchen-accessories', 'drawer-rails']);
    expect(rail.role).toBe('slab');
    expect(plan.misnests).toEqual([]);
    expect(plan.photoFolders).toEqual([
      { folder: 'KITCHEN ACCESSORIES', count: 2 },
      { folder: 'KITCHEN ACCESSORIES/DRAWER RAILS', count: 2 },
    ]);
    expect(plan.issues.find((i) => i.path === 'KITCHEN ACCESSORIES/DRAWER RAILS')!.reason)
      .toContain('"Drawer Rail 4160" after its photo number, in Drawer Rails');
  });

  it('keeps a copy at the range root as the nested sub range product, never two', () => {
    const plan = buildPlan([
      f('k1', 'KITCHEN ACCESSORIES/IMG_1011.HEIC'),
      f('k2', 'KITCHEN ACCESSORIES/IMG_4160.heic', 'md5-4160'),
      f('k3', 'KITCHEN ACCESSORIES/IMG_1046.HEIC'),
      f('n1', 'KITCHEN ACCESSORIES/DRAWER RAILS/IMG_4160.heic', 'md5-4160'),
      f('n2', 'KITCHEN ACCESSORIES/DRAWER RAILS/IMG_4161.heic'),
    ], [], []);
    expect(plan.files.map((x) => x.productSlug)).toEqual([
      'kitchen-accessory-1011', 'kitchen-accessory-1046', 'drawer-rail-4160', 'drawer-rail-4161',
    ]);
    expect(plan.copies).toEqual([{ folder: 'KITCHEN ACCESSORIES', keptIn: 'KITCHEN ACCESSORIES/DRAWER RAILS', count: 1 }]);
  });

  it('stays one product inside a range that does not split, the D104 product folder', () => {
    // A stone photographed on a phone in its own folder is several angles of
    // one stone, never several stones.
    const plan = buildPlan([
      f('a1', '12MM SINTERED STONES/AMBER JADE/SLAB.jpg'),
      f('p1', '12MM SINTERED STONES/NEW STONE/IMG_2001.HEIC'),
      f('p2', '12MM SINTERED STONES/NEW STONE/IMG_2002.HEIC'),
    ], [], []);
    const newStone = plan.files.filter((x) => x.path.includes('NEW STONE'));
    expect(new Set(newStone.map((x) => x.productSlug))).toEqual(new Set(['new-stone']));
    expect(plan.photoFolders).toEqual([]);
  });

  it('stays one product when the range has no loose photographs of its own', () => {
    const plan = buildPlan([
      f('p1', 'NEW RANGE/ONE STONE/IMG_2001.HEIC'),
      f('p2', 'NEW RANGE/ONE STONE/IMG_2002.HEIC'),
    ], [], []);
    expect(new Set(plan.files.map((x) => x.productSlug))).toEqual(new Set(['one-stone']));
    expect(plan.photoFolders).toEqual([]);
  });
});

/**
 * The 12mm stones as they are in Drive: each folder one stone, up to six
 * photographs named by role. None of the new rules may touch them.
 */
describe('stone folders with several role named photographs, untouched', () => {
  const oro = ['CALCATTA ORO SLAB.png', 'APP 1.jpg', 'APP 2.jpg', 'APP 3.jpg', 'SLAB ON STAND.JPG', 'BOOK MATCH.jpg']
    .map((name, i) => f(`co${i}`, `12MM SINTERED STONES/CALCATTA ORO/${name}`));
  const plan = buildPlan([
    ...oro,
    f('lc1', '12MM SINTERED STONES/LIMESTONE CREAMY/LIMESTONE CREAMY SLAB.JPG'),
    f('lc2', '12MM SINTERED STONES/LIMESTONE CREAMY/DSC02078.JPG'),
  ], [], []);

  it('keeps each stone one product with its shots in their roles', () => {
    const shots = plan.files.filter((x) => x.productSlug === 'calcatta-oro');
    expect(shots).toHaveLength(6);
    expect(shots.map((x) => x.role).sort()).toEqual(['application', 'application', 'application', 'bookmatch', 'on_stand', 'slab']);
    expect(new Set(plan.files.map((x) => x.productSlug))).toEqual(new Set(['calcatta-oro', 'limestone-creamy']));
    expect(plan.photoFolders).toEqual([]);
    expect(plan.copies).toEqual([]);
    expect(plan.itemFolders).toEqual([]);
    expect(umbrellaRetirements(plan)).toEqual([]);
  });
});

/**
 * Production still published black-handles, gold-handles, knobs and
 * grey-handles on 7 October: single products from before D104 holding a
 * whole handle folder, beside the per item products that replaced them.
 */
describe('umbrella retirement for D104 item folders', () => {
  const handles = [
    f('b1', 'HANDLES/BLACK HANDLES/B762 BLACK'),
    f('b2', 'HANDLES/BLACK HANDLES/HT-8350 BLACK GOLD'),
    f('g1', 'HANDLES/GOLD HANDLES/A7355 K GOLD'),
    f('g2', 'HANDLES/GOLD HANDLES/HT-8352 BROWN GOLD'),
    f('r1', 'HANDLES/GREY HANDLES/A7800 64 GRAY'),
    f('r2', 'HANDLES/GREY HANDLES/F58 SILVER'),
    f('n1', 'HANDLES/KNOBS/HT-8355 K GOLD KNOB'),
    f('n2', 'HANDLES/KNOBS/2001 64 GRAY KNOB'),
    f('l1', 'HANDLES/LEATHER HANDLES/HT-8321 BROWN'),
  ];
  const plan = buildPlan(handles, [], []);

  it('names each item folder for unpublishing its old single product', () => {
    expect(umbrellaRetirements(plan)).toEqual([
      { folder: 'HANDLES/BLACK HANDLES', replacedBy: 'item' },
      { folder: 'HANDLES/GOLD HANDLES', replacedBy: 'item' },
      { folder: 'HANDLES/GREY HANDLES', replacedBy: 'item' },
      { folder: 'HANDLES/KNOBS', replacedBy: 'item' },
    ]);
  });

  it('leaves a one handle folder alone: it is still one product, and nothing replaces it', () => {
    expect(umbrellaRetirements(plan).some((r) => r.folder === 'HANDLES/LEATHER HANDLES')).toBe(false);
    expect(plan.files.find((x) => x.driveFileId === 'l1')!.productSlug).toBe('leather-handles');
  });

  it('says so in the item folder issue and the report', () => {
    const issue = plan.issues.find((i) => i.path === 'HANDLES/KNOBS')!;
    expect(issue.reason).toContain('"Knobs" product holding every photograph is unpublished');
    expect(renderReport(plan)).toContain('holding the whole folder is unpublished');
  });
});

describe('singularNoun and isPerPhotoRange', () => {
  it.each([
    ['BAMBOO VENEER WALL PANELS', 'Bamboo Veneer Wall Panel'],
    ['KITCHEN ACCESSORIES', 'Kitchen Accessory'],
    ['Drawer rails', 'Drawer Rail'],
    ['15MM SINTERED STONES', '15mm Sintered Stone'],
    ['HINGES', 'Hinge'],
    ['STORAGE BOXES', 'Storage Box'],
    ['GLASS', 'Glass'],
    ['WALL TRAYS', 'Wall Tray'],
  ])('reads one of %s as %s', (folder, noun) => expect(singularNoun(folder)).toBe(noun));

  it('splits a range only when it holds two loose photographs and nothing but phone names', () => {
    expect(isPerPhotoRange(['IMG_1.HEIC', 'IMG_2.HEIC'], ['IMG_1.HEIC', 'IMG_2.HEIC'])).toBe(true);
    expect(isPerPhotoRange(['IMG_1.HEIC'], ['IMG_1.HEIC'])).toBe(false);
    expect(isPerPhotoRange(['IMG_1.HEIC', 'IMG_2.HEIC'], ['IMG_1.HEIC', 'IMG_2.HEIC', 'SLAB.jpg'])).toBe(false);
    expect(isPerPhotoRange([], ['IMG_1.HEIC', 'IMG_2.HEIC'])).toBe(false);
  });
});
