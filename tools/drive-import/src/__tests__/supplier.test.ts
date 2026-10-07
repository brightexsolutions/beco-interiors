import { describe, expect, it } from 'vitest';
import { buildPlan, supplierProductName, throughSuppliers } from '../plan';
import { renderReport } from '../report';
import { supplierLeaks } from '../supplier-guard';
import { containsSupplier, isSupplierFolder, namesSomething, SUPPLIER_WORDS, withoutSupplier } from '../supplier';
import { createFixtureSource } from '../fixture-source';
import type { DriveFile } from '../classify';
import type { FolderNode } from '../misnest';

/**
 * Supplier names never reach the website, D104 amended 7 October 2026.
 *
 * The listing below is the real `12MM SINTERED STONES` folder as Drive held
 * it on 7 October, file for file: seven Heixin stones in their own folders,
 * and Delfone's nineteen photographs of seven stones loose in one folder.
 */
const f = (id: string, path: string): DriveFile => ({
  id, path, md5: `md5-${id}`, size: 1024, modifiedTime: '2026-10-07T00:00:00Z',
});

const R = '12MM SINTERED STONES';
const HEIXIN_FILES = [
  'ANAKIN/ANAKIN APP.jpg', 'ANAKIN/ANAKIN SLAB.jpeg',
  'APPRICOT/APPRICOT APP 2.jpg', 'APPRICOT/APPRICOT APP.jpg', 'APPRICOT/APRICOT SLAB.jpeg',
  'BLACK SANDSTONE/BLACK SANDSTONE APP.png', 'BLACK SANDSTONE/BLACK SANDSTONE SLAB.jpeg',
  'HANTING JADE/HANTING JADE APP 1.jpg', 'HANTING JADE/HANTING JADE APP 2.jpg', 'HANTING JADE/HANTING JADE SLAB.jpeg',
  'HERMES GOLD/HERMES GOLD APP.png', 'HERMES GOLD/HERMES GOLD SLAB.jpeg',
  'INK WHITE/INK WHITE APP.jpg', 'INK WHITE/INK WHITE SLAB.jpeg',
  'PRADA GREEN/PRADA GREEN APP 1.png', 'PRADA GREEN/PRADA GREEN APP 2.jpg', 'PRADA GREEN/PRADA GREEN SLAB.jpeg',
];
const DELFONE_FILES = [
  'BOSNIA GREY APP.jpg', 'BOSNIA GREY SLAB.jpg', 'BULGARIA BLACK APP.jpg', 'BULGARIA BLACK SLAB.JPG',
  'CALACATTA MACCHIA APP 1.jpg', 'CALACATTA MACCHIA SLAB 1.jpg', 'CALACATTA MACCHIA SLAB 2.jpg',
  'MARTHA BROWN APP 1.png', 'MARTHA BROWN APP 2.jpg', 'MARTHA BROWN SLAB.jpg', 'STATUARIO APP 1.jpg',
  'STATURIO SLAB.jpg', 'TAJ MAHAL APP 1.png', 'TAJ MAHAL APP 2.jpg', 'TAJ MAHAL POLISHED SLAB.jpg',
  'TAJ MAHAL.jpg', 'VERDE APP 1.png', 'VERDE APP 2.jpg', 'VERDE LEPANTO SLAB',
];
const STONES = ['ANAKIN', 'APPRICOT', 'BLACK SANDSTONE', 'HANTING JADE', 'HERMES GOLD', 'INK WHITE', 'PRADA GREEN'];

const REAL_12MM: DriveFile[] = [
  ...HEIXIN_FILES.map((p, i) => f(`h${i}`, `${R}/HEIXIN 12MM/${p}`)),
  ...DELFONE_FILES.map((p, i) => f(`d${i}`, `${R}/DELFONE 12MM/${p}`)),
  f('a1', `${R}/AMBER JADE/AMBER JADE SLAB.jpg`),
  f('a2', `${R}/AMBER JADE/APP 1.jpg`),
];
const REAL_FOLDERS: FolderNode[] = [
  { path: 'AMBER JADE', name: 'AMBER JADE', depth: 1 },
  { path: 'DELFONE 12MM', name: 'DELFONE 12MM', depth: 1 },
  { path: 'HEIXIN 12MM', name: 'HEIXIN 12MM', depth: 1 },
  ...STONES.map((s) => ({ path: `HEIXIN 12MM/${s}`, name: s, depth: 2 })),
];

describe('supplier words', () => {
  it('lists Heixin and Delfone, the two suppliers Beco named', () => {
    expect(SUPPLIER_WORDS).toEqual(['HEIXIN', 'DELFONE']);
  });

  it('finds a supplier word in any case and inside a slug, a key or a sentence', () => {
    expect(containsSupplier('heixin-12mm')).toBe(true);
    expect(containsSupplier('heixin-12mm/hanting-jade/slab-0')).toBe(true);
    expect(containsSupplier('Hanting Jade, Heixin 12mm, slab')).toBe(true);
    expect(containsSupplier('Delfone12mm')).toBe(true);
    expect(containsSupplier('Hanting Jade, 12mm Sintered Stones, slab')).toBe(false);
    expect(containsSupplier('anything', [])).toBe(false);
  });

  it('matches a folder by the supplier word, not by its exact name, so a new thickness is caught', () => {
    expect(isSupplierFolder('HEIXIN 12MM')).toBe(true);
    expect(isSupplierFolder('HEIXIN 15MM')).toBe(true);
    expect(isSupplierFolder('Delfone')).toBe(true);
    expect(isSupplierFolder('DELFONE 20MM BOOKMATCH')).toBe(true);
    expect(isSupplierFolder('12MM SINTERED STONES')).toBe(false);
    expect(isSupplierFolder('HANTING JADE')).toBe(false);
  });

  it('takes the word out and tidies what it leaves', () => {
    expect(withoutSupplier('DELFONE 12MM')).toBe('12MM');
    expect(withoutSupplier('heixin-12mm')).toBe('12mm');
    expect(withoutSupplier('Hanting Jade, Heixin 12mm, slab')).toBe('Hanting Jade, 12mm, slab');
    expect(withoutSupplier('Delfone 12mm, 12mm Sintered Stones, slab')).toBe('12mm, 12mm Sintered Stones, slab');
    expect(withoutSupplier('HEIXIN STATUARIO')).toBe('STATUARIO');
    expect(withoutSupplier('Statuario')).toBe('Statuario');
  });

  it('tells a remainder that names a thing from a bare thickness', () => {
    expect(namesSomething('12MM')).toBe(false);
    expect(namesSomething('12 mm')).toBe(false);
    expect(namesSomething('')).toBe(false);
    expect(namesSomething('STATUARIO')).toBe(true);
    expect(namesSomething('slate blue 12mm')).toBe(true);
  });

  it('names a supplier product folder without the supplier, from its range when nothing else is left', () => {
    expect(supplierProductName('DELFONE 12MM', R)).toBe('12mm Sintered Stone');
    expect(supplierProductName('HEIXIN STATUARIO', R)).toBe('Statuario');
  });

  it('reads a supplier folder through below the range, never the range itself', () => {
    expect(throughSuppliers([R, 'HEIXIN 12MM'])).toEqual([R]);
    expect(throughSuppliers([R, 'HEIXIN 12MM', 'INNER'])).toEqual([R, 'INNER']);
    expect(throughSuppliers([R, 'MATT 12MM'])).toEqual([R, 'MATT 12MM']);
  });
});

describe('buildPlan reads supplier folders through, against the real 12mm folder', () => {
  const plan = buildPlan(REAL_12MM, REAL_FOLDERS, []);
  const of = (path: string) => plan.files.filter((x) => x.path.startsWith(`${R}/${path}/`));

  it('files every Heixin stone directly in 12mm Sintered Stones, with no sub range', () => {
    expect(plan.misnests).toEqual([]);
    for (const stone of STONES) {
      const files = of(`HEIXIN 12MM/${stone}`);
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        expect(file.categoryPath).toBe(R);
        expect(file.categorySlug).toBe('12mm-sintered-stones');
        expect(file.categoryChain).toEqual([{ path: R, slug: '12mm-sintered-stones', name: '12mm Sintered Stones' }]);
      }
    }
    const chains = new Set(plan.files.flatMap((x) => x.categoryChain.map((c) => c.path)));
    expect([...chains]).toEqual([R]);
  });

  it('keeps each stone\'s name, slug and Drive path, so the existing product is found again and none is duplicated', () => {
    const hanting = of('HEIXIN 12MM/HANTING JADE');
    expect(new Set(hanting.map((x) => x.productSlug))).toEqual(new Set(['hanting-jade']));
    expect(hanting[0]!.productName).toBe('Hanting Jade');
    // The product's identity is its real Drive folder, which still holds the
    // supplier folder. That is provenance, never rendered.
    expect(hanting[0]!.productPath).toBe(`${R}/HEIXIN 12MM/HANTING JADE`);
    const slugs = new Set(plan.files.map((x) => x.productSlug));
    expect(slugs).toEqual(new Set([
      'anakin', 'appricot', 'black-sandstone', 'hanting-jade', 'hermes-gold', 'ink-white', 'prada-green',
      '12mm-sintered-stone', 'amber-jade',
    ]));
  });

  it('keeps Delfone\'s loose photographs as one product, still flagged as mixed, named for its range', () => {
    const delfone = of('DELFONE 12MM');
    expect(delfone).toHaveLength(19);
    expect(new Set(delfone.map((x) => x.productName))).toEqual(new Set(['12mm Sintered Stone']));
    expect(new Set(delfone.map((x) => x.productSlug))).toEqual(new Set(['12mm-sintered-stone']));
    expect(delfone[0]!.productPath).toBe(`${R}/DELFONE 12MM`);
    expect(delfone[0]!.categoryPath).toBe(R);
    expect(plan.mixed.map((m) => m.path)).toEqual([`${R}/DELFONE 12MM`]);
  });

  it('reports each supplier folder once, with where its products went', () => {
    expect(plan.supplierFolders).toEqual([
      { folder: `${R}/HEIXIN 12MM`, into: R, products: 7 },
      { folder: `${R}/DELFONE 12MM`, into: R, products: 1 },
    ]);
    const report = renderReport(plan);
    expect(report).toContain('SUPPLIER FOLDERS, READ THROUGH');
    expect(report).toContain(`7 product(s)  ${R}/HEIXIN 12MM, filed in ${R}`);
  });

  it('plans nothing that names a supplier: the guard', () => {
    expect(supplierLeaks(plan)).toEqual([]);
  });
});

describe('every other shape a supplier folder can take', () => {
  it('catches a supplier folder Beco have not made yet, HEIXIN 15MM', () => {
    const plan = buildPlan([
      f('1', '15MM SINTERED STONES/HEIXIN 15MM/NERO MARQUINA/SLAB.jpg'),
      f('2', '15MM SINTERED STONES/HEIXIN 15MM/NERO MARQUINA/APP 1.jpg'),
    ], [
      { path: 'HEIXIN 15MM', name: 'HEIXIN 15MM', depth: 1 },
      { path: 'HEIXIN 15MM/NERO MARQUINA', name: 'NERO MARQUINA', depth: 2 },
    ], []);
    expect(plan.files.map((x) => x.categoryPath)).toEqual(['15MM SINTERED STONES', '15MM SINTERED STONES']);
    expect(plan.files[0]!.productSlug).toBe('nero-marquina');
    expect(supplierLeaks(plan)).toEqual([]);
  });

  it('keeps a real sub range inside a supplier folder, one level up, so the depth counts what the site shows', () => {
    const plan = buildPlan([
      f('1', `${R}/HEIXIN 12MM/BOOKMATCHED/CALACATTA/SLAB.jpg`),
    ], [], []);
    expect(plan.files).toHaveLength(1);
    expect(plan.files[0]!.categoryChain.map((c) => c.path)).toEqual([R, `${R}/BOOKMATCHED`]);
    expect(plan.files[0]!.categorySlug).toBe('bookmatched');
    expect(supplierLeaks(plan)).toEqual([]);
  });

  it('gives a stone that clashes with one already in the range the range\'s prefix, never the supplier\'s', () => {
    const plan = buildPlan([
      f('1', `${R}/INK WHITE/SLAB.jpg`),
      f('2', `${R}/HEIXIN 12MM/INK WHITE/SLAB.jpg`),
    ], [], []);
    expect(plan.files.map((x) => x.productSlug)).toEqual(['ink-white', '12mm-sintered-stones-ink-white']);
    expect(supplierLeaks(plan)).toEqual([]);
  });

  it('files the items of a supplier item folder in the range above it, named without the supplier', () => {
    const plan = buildPlan([
      f('1', 'HANDLES/HEIXIN HANDLES/B762 BLACK.jpg'),
      f('2', 'HANDLES/HEIXIN HANDLES/HT-8350 BLACK GOLD.jpg'),
      f('3', 'HANDLES/HEIXIN HANDLES/IMG_1234.jpg'),
      f('4', 'HANDLES/HEIXIN HANDLES/HEIXIN 9001.jpg'),
    ], [], []);
    expect(plan.itemFolders).toEqual([{ folder: 'HANDLES/HEIXIN HANDLES', items: 4, files: 4 }]);
    for (const file of plan.files) expect(file.categoryChain.map((c) => c.path)).toEqual(['HANDLES']);
    expect(plan.files.map((x) => x.productName)).toEqual(['B762 Black', 'HT-8350 Black Gold', 'Handle 1234', 'Handle 9001']);
    expect(supplierLeaks(plan)).toEqual([]);
  });

  it('splits a supplier folder of phone photographs in a per photograph range, filed in the range', () => {
    const plan = buildPlan([
      f('1', 'KITCHEN ACCESSORIES/IMG_1001.jpg'),
      f('2', 'KITCHEN ACCESSORIES/IMG_1002.jpg'),
      f('3', 'KITCHEN ACCESSORIES/DELFONE RAILS/IMG_2001.jpg'),
      f('4', 'KITCHEN ACCESSORIES/DELFONE RAILS/IMG_2002.jpg'),
    ], [], []);
    const rails = plan.files.filter((x) => x.path.includes('/DELFONE RAILS/'));
    expect(rails.map((x) => x.productName)).toEqual(['Kitchen Accessory 2001', 'Kitchen Accessory 2002']);
    for (const file of rails) expect(file.categoryPath).toBe('KITCHEN ACCESSORIES');
    expect(supplierLeaks(plan)).toEqual([]);
  });

  it('skips and reports a supplier folder at the top of Drive, which has no range to file in', () => {
    const plan = buildPlan([f('1', 'HEIXIN/INK WHITE/SLAB.jpg')], [], []);
    expect(plan.files).toEqual([]);
    expect(plan.issues.map((i) => i.path)).toEqual(['HEIXIN']);
    expect(plan.issues[0]!.reason).toMatch(/named for a supplier/);
  });

  it('renames a product folder that carries the supplier word with a stone name', () => {
    const plan = buildPlan([f('1', `${R}/HEIXIN STATUARIO/SLAB.jpg`)], [], []);
    expect(plan.files[0]!.productName).toBe('Statuario');
    expect(plan.files[0]!.productSlug).toBe('statuario');
    expect(supplierLeaks(plan)).toEqual([]);
  });

  it('holds the whole fixture catalogue clean', async () => {
    const source = createFixtureSource();
    const plan = buildPlan(await source.listAll('fixture'), await source.listFolders('fixture'), []);
    expect(plan.files.length).toBeGreaterThan(0);
    expect(supplierLeaks(plan)).toEqual([]);
  });
});

describe('the guard bites', () => {
  it('reports every field a supplier word would reach, so a regression cannot pass silently', () => {
    const leaks = supplierLeaks({
      files: [{
        driveFileId: 'x', path: `${R}/HEIXIN 12MM/INK WHITE/SLAB.jpg`, md5: null,
        categorySlug: 'heixin-12mm', categoryPath: `${R}/HEIXIN 12MM`,
        categoryChain: [
          { path: R, slug: '12mm-sintered-stones', name: '12mm Sintered Stones' },
          { path: `${R}/HEIXIN 12MM`, slug: 'heixin-12mm', name: 'Heixin 12mm' },
        ],
        productSlug: 'ink-white', productPath: `${R}/HEIXIN 12MM/INK WHITE`, productName: 'Ink White',
        role: 'slab', outcome: 'new', needsDownload: true,
      }],
    });
    expect(new Set(leaks.map((l) => l.field))).toEqual(new Set([
      'category slug', 'category path', 'category name', 'alt text', 'image key',
    ]));
    expect(leaks.find((l) => l.field === 'alt text')!.value).toBe('Ink White, Heixin 12mm, slab');
  });
});
