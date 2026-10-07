import { classify, summarise, type Classified, type DriveFile, type KnownFile } from './classify';
import { detectMisnests, misnestedPaths, type FolderNode, type Misnest } from './misnest';
import { resolveRole } from './roles';
import { slugify, titleise, titleiseItem } from './slug';
import type { ImageRole } from '@beco/types';
import { detectMixedFolders, subjectOf, type MixedFolder } from './mixed';

/**
 * Turns a Drive listing into a plan: what to import, what to skip, and why.
 *
 * Pure. No network, no database, no filesystem. That is what makes the
 * pipeline's judgement testable rather than only its plumbing.
 *
 * The Drive convention, as Beco actually keep it (D104):
 *
 *   CATEGORY/PRODUCT/photographs                 a range and its products
 *   CATEGORY/SUB RANGE/PRODUCT/photographs       a range, its sub ranges, their products
 *   CATEGORY/SUB RANGE/one photograph per item   handles: each file IS an item
 *   CATEGORY/photographs                         loose: one umbrella product
 *
 * A folder is a PRODUCT when it holds photographs directly, and a CATEGORY
 * when it holds only folders. Two category levels from the Drive root is the
 * most the site shows (the editorial group above a Drive folder makes three),
 * so anything deeper is reported and skipped rather than flattened.
 */

export interface CategoryNode {
  /** The Drive folder path, verbatim. The category's IDENTITY in the database. */
  path: string;
  slug: string;
  name: string;
}

export interface PlannedFile {
  driveFileId: string;
  path: string;
  /** Carried through so the download cache can key on content, not just id. */
  md5: string | null;
  /** The deepest category the product files under. */
  categorySlug: string;
  /**
   * The Drive folder name, verbatim. This is the category's IDENTITY, not the
   * slug, which is derived and which an editor may later change. Matching on
   * the slug is what produced two category rows for one Drive folder.
   */
  categoryPath: string;
  /** Every category above the product, top first. One or two entries. */
  categoryChain: CategoryNode[];
  productSlug: string;
  /** The Drive folder path, verbatim, so provenance survives a slug change. */
  productPath: string;
  productName: string;
  role: ImageRole;
  outcome: Classified['outcome'];
  /** Only new and changed files are downloaded. Everything else is metadata. */
  needsDownload: boolean;
  /**
   * Set for a loose photograph in a range split by finish, D122. The run
   * reads the finish from the pixels and files the product under that
   * finish's sub range, so the plan, which never sees pixels, leaves the
   * product in the range itself.
   */
  splitByFinish?: { folder: string; noun: string; ref: string };
}

export interface Issue {
  path: string;
  reason: string;
}

export interface ImportPlan {
  files: PlannedFile[];
  issues: Issue[];
  misnests: Misnest[];
  /** Product folders that are naming several products inside themselves. */
  mixed: MixedFolder[];
  /** Category folders whose files have no product folder to belong to. */
  looseFolders: Array<{ folder: string; count: number }>;
  /** Folders where every photograph is its own item, and how many items came out. */
  itemFolders: Array<{ folder: string; items: number; files: number }>;
  /** Ranges whose loose photographs became one product each, sorted by finish. */
  finishFolders: Array<{ folder: string; count: number }>;
  /**
   * Ranges whose loose photographs became one product each, filed in the
   * range itself, and sub ranges of phone photographs inside such a range.
   */
  photoFolders: Array<{ folder: string; count: number }>;
  /**
   * Byte for byte copies of one photograph in ranges split per photograph,
   * imported once: `count` files in `folder` were left out because the same
   * photograph is the product in `keptIn`, which may be `folder` itself.
   */
  copies: Array<{ folder: string; keptIn: string; count: number }>;
  /** Gallery and brand files, correctly loose, handled elsewhere. */
  galleryFiles: number;
  counts: ReturnType<typeof summarise>;
  /** Products where no file resolved to a slab shot. */
  productsWithoutSlab: string[];
  /** Products carrying at least one file we could not place. */
  productsWithUnknowns: string[];
}

const IGNORE = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i;

/** Price lists and spec sheets. Reference material, never a photograph. */
const DOCUMENT = /\.(pdf|xlsx?|docx?|csv|txt|pptx?|numbers|pages)$/i;

/**
 * Filenames a phone or a camera gives a photograph. These say nothing about
 * what the photograph shows, so a folder of them is one umbrella product,
 * never one product per file.
 */
const CAMERA_NAME = /^(IMG|DSC|DSCN|DSCF|PXL|MVIMG|DCIM|IMAGE|PHOTO|PIC|SCREENSHOT|WHATSAPP IMAGE|P)[\s_-]*E?\d|^\d{6,}|^\d{8}[_-]\d{6}/i;

/** "HT-8350 GOLD BLACK 2" is the second photograph of HT-8350 GOLD BLACK. */
const COPY_COUNTER = /[\s_-]*(?:\(\d{1,2}\)|-\s?\d{1,2}|\s\d{1,2}|copy)$/i;

/**
 * Folders that are NOT product categories. They hold gallery and brand
 * material, so loose files in them are correct rather than a mistake, and
 * reporting them as errors would bury the real problems.
 */
const NON_PRODUCT_FOLDERS = new Set([
  'SITE PHOTOS', 'SITE VIDEOS', 'BRAND IDENTITY', 'BECO BACKUPS',
]);

/**
 * Ranges Beco no longer sells. A folder with one of these names is left
 * alone, whatever it holds, and reported once so nobody wonders where its
 * photographs went. Lighting was retired on Beco's own instruction, D103,
 * and the "Lights" folder of loose phone photographs still exists in Drive.
 */
export const RETIRED_FOLDERS = new Set(['LIGHTING', 'LIGHTS']);

/**
 * Ranges whose loose phone photographs each become their own product, filed
 * by the finish read from the photograph, D122. The value is what one item
 * is called, for its placeholder name. Brown's instruction, 5 October: the
 * hinges are separate items with separate codes and prices, their files say
 * nothing, so sort them by colour and let the Beco team set the codes in the
 * dashboard. Add a range here when its folder is in the same state.
 */
export const SPLIT_BY_FINISH: ReadonlyMap<string, string> = new Map([
  ['HINGES', 'Hinge'],
  // Same state in Drive on 5 October, phone photographs only, and added on
  // Brown's go ahead the same day.
  ['DOOR LOCKS', 'Door Lock'],
  ['FURNITURE LEGS', 'Furniture Leg'],
]);

/**
 * Ranges whose loose phone photographs each become their own product, the
 * way D122 splits the hinges, but filed in the range itself: a colour sub
 * range means nothing for stone. The value is what one item is called.
 * Brown, 6 October: `15MM SINTERED STONES` held five phone photographs of
 * different stones and imported as one product showing all of them. Once
 * Beco names each photograph after its stone, D104's item rule names the
 * products and this path is never reached.
 */
export const SPLIT_PER_PHOTO: ReadonlyMap<string, string> = new Map([
  ['15MM SINTERED STONES', '15mm Sintered Stone'],
]);

/**
 * What one item in a range is called, from the range's own name: the last
 * word made singular. "BAMBOO VENEER WALL PANELS" is "Bamboo Veneer Wall
 * Panel", "OFFICE ACCESSORIES" is "Office Accessory", "Drawer rails" is
 * "Drawer Rail". A placeholder only: Beco rename items in the dashboard.
 */
export const singularNoun = (folder: string): string => {
  const words = titleise(folder).split(' ');
  const last = words.pop() ?? '';
  const single = /[^aeiou]ies$/i.test(last)
    ? `${last.slice(0, -3)}y`
    : /(x|ch|sh|ss)es$/i.test(last)
      ? last.slice(0, -2)
      : /[^su]s$/i.test(last)
        ? last.slice(0, -1)
        : last;
  return [...words, single].join(' ');
};

/** The noun for a range split per photograph: listed, or derived from its name. */
export const photoNounFor = (folder: string): string =>
  SPLIT_PER_PHOTO.get(folder.toUpperCase()) ?? singularNoun(folder);

/**
 * Whether a range splits one product per photograph without being listed,
 * 7 October. Decided per range, from everything under it, and only for a
 * range: a range is a group of items, where a product folder may be one
 * stone photographed from several angles, so a product folder is never
 * split this way. It needs at least two loose photographs at its root, and
 * every photograph anywhere under it must be a phone or export name. A
 * stone range always carries role named files (SLAB, APP 1) and never
 * qualifies; a range of named items is D104's item rule instead.
 * `SPLIT_PER_PHOTO` still forces a range that also holds named files, and
 * overrides the derived noun.
 */
export const isPerPhotoRange = (loose: readonly string[], all: readonly string[]): boolean =>
  loose.length >= 2 && all.every((name) => isExportName(name));

/**
 * A short, stable reference for a photograph with no name: the number a
 * phone gave it ("IMG_1193" is 1193), or the start of a random name. It is
 * the product's slug, so it must not change between runs.
 */
export const photoRef = (filename: string): string => {
  const name = stem(filename).trim().replace(COPY_COUNTER, '');
  const digits = isCameraName(name) ? name.match(/(\d{3,})(?!.*\d{3,})/) : null;
  if (digits) return digits[1]!;
  return slugify(name).replace(/-/g, '').slice(0, 8) || 'photo';
};

/** The most category folders a product may sit under, counted from the Drive root. */
const MAX_CATEGORY_DEPTH = 2;

const stem = (filename: string): string => filename.replace(/\.[^.]+$/, '');

const isCameraName = (filename: string): boolean => CAMERA_NAME.test(stem(filename).trim());

/** The item a photograph names, with any "2" or "(1)" copy counter removed. */
export const itemNameOf = (filename: string): string =>
  stem(filename).trim().replace(COPY_COUNTER, '').trim();

/** Two spellings of one item share a key: same words, any order. */
export const itemKeyOf = (filename: string): string =>
  itemNameOf(filename)
    .toUpperCase()
    .replace(/[_\-.()]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');

const dirname = (path: string): string => path.split('/').slice(0, -1).join('/');

/** An iPhone export: `34D00DD2-442A-4748-BF08-86C2643EE870.jpg`. */
const UUID_NAME = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
/** A bare run of hex, eight or more long with a digit in it, as some apps export. */
const HEX_NAME = /^(?=[0-9A-F]*\d)[0-9A-F]{8,}$/i;

/**
 * A name a phone, a camera or an export gave the file: `IMG_1234`, `PXL_...`,
 * `DSC02078`, a UUID, a bare hex or a long bare number. It says nothing about
 * the item, so it is never used as an item's name.
 */
export const isExportName = (filename: string): boolean => {
  const name = itemNameOf(filename);
  return isCameraName(name) || UUID_NAME.test(name) || HEX_NAME.test(name);
};

/**
 * A short, stable reference for an export named item: the first four
 * characters of a UUID or a hex name, uppercase ("34D0"), or the number a
 * camera gave it ("1234"). It goes into the slug, so it must not change.
 */
export const exportRef = (filename: string): string => {
  const name = itemNameOf(filename);
  if (UUID_NAME.test(name) || HEX_NAME.test(name)) return name.slice(0, 4).toUpperCase();
  return photoRef(filename).toUpperCase();
};

/**
 * What one item in an item folder is called, for the placeholder name an
 * export named photograph gets there. Keyed by the top folder, with the sub
 * ranges that hold something else. Only the placeholder uses it: an item
 * named by its file keeps that name exactly as typed, and Beco rename items
 * in the dashboard.
 */
export const ITEM_NOUNS: ReadonlyMap<string, { noun: string; bySubfolder?: Readonly<Record<string, string>> }> =
  new Map([['HANDLES', { noun: 'Handle', bySubfolder: { KNOBS: 'Knob' } }]]);

/** Folder words that are the noun, not the finish: "GOLD HANDLES" is Gold. */
const NOUN_WORD = /^(HANDLES?|KNOBS?|PULLS?)$/i;

/** The noun for an item filed in these folders, or undefined outside ITEM_NOUNS. */
export const itemNounFor = (dirs: readonly string[]): string | undefined => {
  const entry = ITEM_NOUNS.get((dirs[0] ?? '').toUpperCase());
  if (!entry) return undefined;
  const leaf = (dirs[dirs.length - 1] ?? '').toUpperCase();
  return entry.bySubfolder?.[leaf] ?? entry.noun;
};

/**
 * A readable placeholder for an export named item, never its filename: the
 * finish its folder names, the noun, the reference. "Gold Handle 34D0" in Gold Handles, "Knob 1234" in
 * Knobs, which names no finish. The way the hinges are named, D122. Outside
 * ITEM_NOUNS there is no noun to add, so the folder's own name carries the
 * reference: "Hinges 1234".
 */
export const exportItemName = (folder: string, noun: string | undefined, ref: string): string => {
  if (!noun) return `${titleise(folder)} ${ref}`;
  const finish = titleise(folder.split(/\s+/).filter((w) => !NOUN_WORD.test(w)).join(' '));
  return [finish, noun, ref].filter(Boolean).join(' ');
};

/**
 * Whether every photograph in a folder names its own item: handles uploaded
 * as "B762 BLACK", "HT-8350 BLACK GOLD", one file each. Nothing is guessed.
 * Every file must fail role resolution, none may carry a camera name, and
 * the folder must name at least two different things once its own words and
 * the role words are set aside. A stone folder of supplier coded files
 * ("2201632A01171", "Sandstone Beige 2201632A01171") names one thing and
 * stays one product with its unknowns reported, exactly as before.
 */
export const isItemFolder = (folderName: string, filenames: readonly string[]): boolean => {
  // Export named files (IMG_1234, a UUID) say nothing either way, so the
  // decision is made on the rest; in an item folder each becomes an item of
  // its own. A folder of nothing but export names is never an item folder.
  const named = filenames.filter((name) => !isExportName(name));
  if (named.length < 2) return false;
  if (named.some((name) => resolveRole(name, folderName) !== 'unknown')) return false;
  const subjects = new Set(named.map((name) => subjectOf(itemNameOf(name), folderName)).filter(Boolean));
  return subjects.size >= 2;
};

const chainFor = (dirs: readonly string[]): CategoryNode[] =>
  dirs.map((_, index) => {
    const path = dirs.slice(0, index + 1).join('/');
    const leaf = dirs[index]!;
    return { path, slug: slugify(leaf), name: titleise(leaf) };
  });

export const buildPlan = (
  listing: readonly DriveFile[],
  folders: readonly FolderNode[],
  known: readonly KnownFile[],
  opts: { force?: boolean } = {},
): ImportPlan => {
  const issues: Issue[] = [];

  // Which folders hold photographs directly. That is what tells a product
  // folder from a category folder, and a misnest from a sub range.
  const photoDirs = new Set<string>();
  for (const f of listing) {
    if (IGNORE.test(f.path) || DOCUMENT.test(f.path)) continue;
    photoDirs.add(dirname(f.path));
  }
  // Misnest detection reads CATEGORY relative paths ("AMBER JADE/CYPRUS
  // LIGHT GREY"), file paths are ROOT relative. Compare on the category
  // relative portion so the two agree.
  const categoryRelative = (path: string): string => path.split('/').slice(1).join('/');
  const photoDirsRelative = new Set([...photoDirs].map(categoryRelative));
  const misnests = detectMisnests(folders, (relativePath) => photoDirsRelative.has(relativePath));
  const excluded = misnestedPaths(misnests);
  for (const m of misnests) issues.push({ path: m.path, reason: m.reason });

  const retired = new Map<string, number>();
  const documents = new Map<string, number>();
  const usable = listing.filter((f) => {
    if (IGNORE.test(f.path)) return false;
    const top = (f.path.split('/')[0] ?? '').toUpperCase();
    if (RETIRED_FOLDERS.has(top)) {
      retired.set(top, (retired.get(top) ?? 0) + 1);
      return false;
    }
    if (NON_PRODUCT_FOLDERS.has(top)) return true;
    if (DOCUMENT.test(f.path)) {
      const dir = dirname(f.path) || '(root)';
      documents.set(dir, (documents.get(dir) ?? 0) + 1);
      return false;
    }
    const rel = categoryRelative(f.path);
    // Anything under a misnested folder is skipped along with its parent.
    for (const bad of excluded) if (rel === bad || rel.startsWith(`${bad}/`)) return false;
    return true;
  });

  for (const [folder, count] of retired) {
    issues.push({
      path: folder,
      reason:
        `Beco no longer sells this range, so the ${count} file(s) in "${folder}" are not ` +
        'imported. The folder can be archived in Drive; nothing on the site reads it.',
    });
  }
  for (const [folder, count] of documents) {
    issues.push({
      path: folder,
      reason:
        `${count} document(s) in "${folder}" are reference material (price lists, spec sheets) ` +
        'and are not imported. Prices and specifications are entered in the dashboard, ' +
        'where they are checked, not read from a spreadsheet.',
    });
  }

  // Item folders: decided per folder, before any file in it is planned, so
  // every file in the folder gets the same treatment.
  const filesByDir = new Map<string, string[]>();
  for (const f of usable) {
    const dir = dirname(f.path);
    filesByDir.set(dir, [...(filesByDir.get(dir) ?? []), f.path.split('/').pop()!]);
  }
  const itemDirs = new Set<string>();
  for (const [dir, names] of filesByDir) {
    const folderName = dir.split('/').pop() ?? '';
    if (!dir || NON_PRODUCT_FOLDERS.has((dir.split('/')[0] ?? '').toUpperCase())) continue;
    if (isItemFolder(folderName, names)) itemDirs.add(dir);
  }

  // Ranges split one product per photograph: listed, or detected because
  // every photograph under them is a phone name. A range split by finish is
  // its own path and never also split here.
  const underRange = new Map<string, { loose: string[]; all: string[] }>();
  for (const f of usable) {
    const segments = f.path.split('/');
    if (segments.length < 2) continue;
    const top = segments[0]!;
    if (NON_PRODUCT_FOLDERS.has(top.toUpperCase()) || SPLIT_BY_FINISH.has(top.toUpperCase())) continue;
    const entry = underRange.get(top) ?? { loose: [], all: [] };
    const name = segments[segments.length - 1]!;
    entry.all.push(name);
    if (segments.length === 2) entry.loose.push(name);
    underRange.set(top, entry);
  }
  const perPhotoRanges = new Set<string>();
  for (const [top, entry] of underRange) {
    if (SPLIT_PER_PHOTO.has(top.toUpperCase()) || isPerPhotoRange(entry.loose, entry.all)) perPhotoRanges.add(top);
  }
  // A folder of phone photographs inside such a range is a sub range of
  // items in the same state ("KITCHEN ACCESSORIES/DRAWER RAILS"), so it
  // splits the same way, filed in that sub range. One with a single file or
  // any named file is a product folder, exactly as before.
  const perPhotoSubDirs = new Set<string>();
  for (const [dir, names] of filesByDir) {
    const parts = dir.split('/');
    if (parts.length !== 2 || !perPhotoRanges.has(parts[0]!) || itemDirs.has(dir)) continue;
    if (names.length >= 2 && names.every((name) => isExportName(name))) perPhotoSubDirs.add(dir);
  }

  /** The folder a photograph is split per photograph in, or undefined. */
  const splitFolderOf = (path: string): string | undefined => {
    const dir = dirname(path);
    if (!dir || itemDirs.has(dir)) return undefined;
    if (!dir.includes('/') && (perPhotoRanges.has(dir) || SPLIT_BY_FINISH.has(dir.toUpperCase()))) return dir;
    if (perPhotoSubDirs.has(dir)) return dir;
    return undefined;
  };

  // One photograph is one product, however many times it was uploaded.
  // Drive gives each copy its own id but the same md5: KITCHEN ACCESSORIES
  // held every Drawer rails photograph again, some of them three times. A
  // photograph is kept in the folder holding the fewest photographs, the
  // narrower range Beco sorted it into, then by path; within a folder, the
  // copy with the lowest id. Both are stable from run to run, so the
  // product's slug does not move.
  const splitFiles = usable.filter((f) => f.md5 && splitFolderOf(f.path) !== undefined);
  const distinctIn = new Map<string, Set<string>>();
  for (const f of splitFiles) {
    const folder = splitFolderOf(f.path)!;
    distinctIn.set(folder, (distinctIn.get(folder) ?? new Set<string>()).add(f.md5!));
  }
  const byContent = new Map<string, DriveFile[]>();
  for (const f of splitFiles) byContent.set(f.md5!, [...(byContent.get(f.md5!) ?? []), f]);
  const copyOf = new Map<string, { folder: string; keptIn: string }>();
  for (const group of byContent.values()) {
    if (group.length < 2) continue;
    const kept = [...group].sort((a, b) => {
      const fa = splitFolderOf(a.path)!;
      const fb = splitFolderOf(b.path)!;
      return distinctIn.get(fa)!.size - distinctIn.get(fb)!.size ||
        (fa < fb ? -1 : fa > fb ? 1 : 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    })[0]!;
    const keptIn = splitFolderOf(kept.path)!;
    for (const f of group) if (f !== kept) copyOf.set(f.id, { folder: splitFolderOf(f.path)!, keptIn });
  }
  const copyCounts = new Map<string, { folder: string; keptIn: string; count: number }>();
  for (const c of copyOf.values()) {
    const key = JSON.stringify([c.folder, c.keptIn]);
    const entry = copyCounts.get(key) ?? { ...c, count: 0 };
    entry.count += 1;
    copyCounts.set(key, entry);
  }
  for (const { folder, keptIn, count } of copyCounts.values()) {
    issues.push({
      path: folder,
      reason: folder === keptIn
        ? `${count} file(s) in "${folder}" are exact copies of another photograph in the same ` +
          'folder, so each photograph is imported once. The copies can be deleted in Drive.'
        : `${count} photograph(s) in "${folder}" are exact copies of photographs in "${keptIn}", ` +
          'the folder holding fewer photographs, so each is imported once, as a product there, ' +
          'never as a second product here. If those items belong in this range too, file them ' +
          'in the dashboard; the import never moves a product once it exists.',
    });
  }

  const classified = classify(usable, known);
  const files: PlannedFile[] = [];
  const slabByProduct = new Map<string, boolean>();
  const unknownByProduct = new Map<string, boolean>();
  /** Category folders holding files directly, with no product folder. */
  const looseByFolder = new Map<string, number>();
  /** Loose folders that were real enough to import as one umbrella product,
      as opposed to a genuinely stray file at the root with no category at
      all, which stays reported but unimported. */
  const looseImported = new Set<string>();
  /** Loose photographs per range split by finish. */
  const finishByFolder = new Map<string, number>();
  /** One real photo number per split range, for the report's example name. */
  const finishExample = new Map<string, string>();
  /** Loose photographs per range split one per photograph, unsorted. */
  const photoByFolder = new Map<string, number>();
  const photoExample = new Map<string, string>();
  /** Role bearing filenames per product folder, for the mixed folder check. */
  const namedByFolder = new Map<string, { folderName: string; filenames: string[] }>();
  /** Item folders: distinct items and file counts, for the report. */
  const itemsByDir = new Map<string, { items: Set<string>; files: number }>();
  /** Product slugs already claimed, and by which folder, so two items with
      the same name in different folders cannot merge into one product. */
  const slugOwner = new Map<string, string>();
  const tooDeep = new Map<string, number>();
  /** Photographs seen per item, so the first stands as the item's own shot. */
  const itemShotCount = new Map<string, number>();
  /** The first spelling seen of each item, per folder, so "GOLD BLACK 2"
      joins "BLACK GOLD" rather than becoming a second product. */
  const itemNameByKey = new Map<string, string>();

  const claimSlug = (wanted: string, productPath: string, parentFolder: string): string => {
    const owner = slugOwner.get(wanted);
    if (!owner || owner === productPath) {
      slugOwner.set(wanted, productPath);
      return wanted;
    }
    const alternate = `${slugify(parentFolder)}-${wanted}`;
    slugOwner.set(alternate, productPath);
    return alternate;
  };

  for (const c of classified) {
    if (c.outcome === 'missing') {
      issues.push({
        path: c.file.path,
        // Never auto deleted. A vanished file is as likely an accidental drag
        // as an intent, and this dataset has already proved that happens.
        reason:
          'Previously imported and no longer present in Drive. Flagged for a human to ' +
          'confirm. Nothing is removed automatically.',
      });
      continue;
    }

    const segments = c.file.path.split('/');
    const filename = segments[segments.length - 1]!;
    const dirs = segments.slice(0, -1);
    const top = dirs[0] ?? '';
    const dir = dirs.join('/');
    const driveFileId = 'id' in c.file ? c.file.id : c.file.driveFileId;
    // A copy of a photograph that is already a product elsewhere.
    if (copyOf.has(driveFileId)) continue;
    const base = {
      driveFileId,
      md5: c.file.md5 ?? null,
      path: c.file.path,
      outcome: c.outcome,
      // Only new and changed files are fetched. A rename re resolves its role
      // from metadata and never re downloads 44MB. `force` re-downloads and
      // re-encodes everything, for when the pipeline itself changed rather
      // than the source.
      needsDownload: opts.force || c.outcome === 'new' || c.outcome === 'changed',
    };

    // A file with no category folder at all, sitting loose at the root of
    // the whole Drive listing: there is nothing here to name a product
    // after, so this stays skip-only.
    if (dirs.length === 0) {
      looseByFolder.set('', (looseByFolder.get('') ?? 0) + 1);
      continue;
    }

    // Gallery and brand folders are handled elsewhere, not as products.
    if (NON_PRODUCT_FOLDERS.has(top.toUpperCase())) {
      looseByFolder.set(top, (looseByFolder.get(top) ?? 0) + 1);
      continue;
    }

    // One photograph per item. The folder becomes a category (or stays the
    // category it already is) and each distinct filename becomes a product
    // named exactly as Beco typed it. The item's first photograph stands as
    // its own shot; a second file of the same item joins its gallery.
    if (itemDirs.has(dir)) {
      if (dirs.length > MAX_CATEGORY_DEPTH) {
        tooDeep.set(dir, (tooDeep.get(dir) ?? 0) + 1);
        continue;
      }
      const chain = chainFor(dirs);
      const leaf = chain[chain.length - 1]!;
      const key = `${dir}/${itemKeyOf(filename)}`;
      const itemName = itemNameByKey.get(key) ?? itemNameOf(filename);
      itemNameByKey.set(key, itemName);
      const productPath = `${dir}/${itemName}`;
      const folderName = dirs[dirs.length - 1]!;
      // A phone or export name (a UUID, IMG_1234) is never a product name.
      // It gets a placeholder, "Gold Handle 34D0", for Beco to rename in the
      // dashboard. Every other item keeps the name its file gives it.
      const exported = isExportName(filename);
      const productName = exported
        ? exportItemName(folderName, itemNounFor(dirs), exportRef(filename))
        : titleiseItem(itemName);
      const productSlug = claimSlug(slugify(exported ? productName : itemName), productPath, folderName);
      const seen = itemShotCount.get(productPath) ?? 0;
      itemShotCount.set(productPath, seen + 1);
      slabByProduct.set(productSlug, true);
      const entry = itemsByDir.get(dir) ?? { items: new Set<string>(), files: 0 };
      entry.items.add(key);
      entry.files += 1;
      itemsByDir.set(dir, entry);
      files.push({
        ...base,
        categorySlug: leaf.slug,
        categoryPath: leaf.path,
        categoryChain: chain,
        productPath,
        productSlug,
        productName,
        role: seen === 0 ? 'slab' : 'application',
      });
      continue;
    }

    // A range split per photograph with no finish sorting: each loose
    // photograph is its own product, filed in the range itself, or in its
    // sub range when it sits in a folder of phone photographs there.
    const photoNoun = dirs.length === 1 && perPhotoRanges.has(top)
      ? photoNounFor(top)
      : perPhotoSubDirs.has(dir) ? singularNoun(dirs[1]!) : undefined;
    if (photoNoun) {
      const ref = photoRef(filename);
      const productPath = `${dir}/${stem(filename).trim()}`;
      const productName = `${photoNoun} ${ref}`;
      const productSlug = claimSlug(slugify(productName), productPath, dirs[dirs.length - 1]!);
      const chain = chainFor(dirs);
      const leaf = chain[chain.length - 1]!;
      photoByFolder.set(dir, (photoByFolder.get(dir) ?? 0) + 1);
      if (!photoExample.has(dir)) photoExample.set(dir, productName);
      files.push({
        ...base,
        categorySlug: leaf.slug,
        categoryPath: leaf.path,
        categoryChain: chain,
        productPath,
        productSlug,
        productName,
        // The only photograph of its product, so it is the product's own shot.
        role: 'slab',
      });
      continue;
    }

    // A range split by finish, D122: each loose photograph is its own item.
    const splitNoun = dirs.length === 1 ? SPLIT_BY_FINISH.get(top.toUpperCase()) : undefined;
    if (splitNoun) {
      const ref = photoRef(filename);
      const productPath = `${top}/${stem(filename).trim()}`;
      const productSlug = claimSlug(slugify(`${splitNoun} ${ref}`), productPath, top);
      const chain = chainFor(dirs);
      finishByFolder.set(top, (finishByFolder.get(top) ?? 0) + 1);
      if (!finishExample.has(top)) finishExample.set(top, ref);
      files.push({
        ...base,
        categorySlug: chain[0]!.slug,
        categoryPath: top,
        categoryChain: chain,
        productPath,
        productSlug,
        productName: `${splitNoun} ${ref}`,
        // The only photograph of its product, so it is the product's own shot.
        role: 'slab',
        splitByFinish: { folder: top, noun: splitNoun, ref },
      });
      continue;
    }

    if (dirs.length === 1) {
      // Counted per folder and reported ONCE. Repeating this 157 times for a
      // single folder buries the actual problems in noise.
      looseByFolder.set(top, (looseByFolder.get(top) ?? 0) + 1);

      // A file directly inside a real category folder, one level deep, e.g.
      // "FURNITURE LEGS/IMG_4517.HEIC", is different: the category itself
      // is real. Imported on Brown's explicit instruction, 14 September, as
      // ONE product named after the category: real photography of real stock
      // is worth publishing before it is organised, and withholding every one
      // of these ranges entirely was worse than one umbrella product per
      // range. Every photo's role is still resolved normally rather than
      // guessed: a raw camera filename with no role word still resolves to
      // `unknown` and is still reported, exactly as it would inside a real
      // product folder.
      const role = resolveRole(filename, top);
      const productSlug = slugify(top);
      if (role === 'unknown') unknownByProduct.set(productSlug, true);
      if (!slabByProduct.has(productSlug)) slabByProduct.set(productSlug, false);
      looseImported.add(top);
      const chain = chainFor(dirs);
      files.push({
        ...base,
        categorySlug: chain[0]!.slug,
        categoryPath: top,
        categoryChain: chain,
        productPath: top,
        productSlug,
        productName: titleise(top),
        role,
      });
      continue;
    }

    // CATEGORY/.../PRODUCT/file. The product is the folder holding the
    // file; everything above it is a category. Misnests (a folder nested
    // inside a product folder) were excluded above, so by here every folder
    // above the file is a category.
    const categoryDirs = dirs.slice(0, -1);
    const productFolder = dirs[dirs.length - 1]!;
    if (categoryDirs.length > MAX_CATEGORY_DEPTH) {
      tooDeep.set(dir, (tooDeep.get(dir) ?? 0) + 1);
      continue;
    }
    const chain = chainFor(categoryDirs);
    const leaf = chain[chain.length - 1]!;
    const role = resolveRole(filename, productFolder);
    const productPath = dir;
    const productSlug = claimSlug(slugify(productFolder), productPath, categoryDirs[categoryDirs.length - 1]!);

    if (role === 'slab') slabByProduct.set(productSlug, true);
    if (!slabByProduct.has(productSlug)) slabByProduct.set(productSlug, false);

    if (role !== 'unknown') {
      // Only files whose role resolved. An unreadable camera filename is a
      // naming problem reported on its own, not evidence of a second product.
      const entry = namedByFolder.get(productPath) ?? { folderName: productFolder, filenames: [] };
      entry.filenames.push(filename);
      namedByFolder.set(productPath, entry);
    }

    if (role === 'unknown') {
      unknownByProduct.set(productSlug, true);
      issues.push({
        path: c.file.path,
        reason:
          `"${filename}" does not say what it shows, so it cannot be placed automatically. ` +
          'Rename it to SLAB, SLAB ON STAND, BOOK MATCH, or APP 1. Imported with no role ' +
          'rather than guessed into one.',
      });
    }

    files.push({
      ...base,
      categorySlug: leaf.slug,
      categoryPath: leaf.path,
      categoryChain: chain,
      productPath,
      productSlug,
      productName: titleise(productFolder),
      role,
    });
  }

  // A product folder that is actually naming several products inside itself.
  // Reported, never split: the split would have to be guessed from filenames,
  // and a wrong guess puts a wrong specification on a live page.
  const mixed: MixedFolder[] = detectMixedFolders(
    [...namedByFolder].map(([folderPath, v]) => ({
      folderPath,
      folderName: v.folderName,
      filenames: v.filenames,
    })),
  );
  for (const m of mixed) issues.push({ path: m.path, reason: m.reason });

  for (const [folder, count] of tooDeep) {
    issues.push({
      path: folder,
      reason:
        `${count} file(s) in "${folder}" sit more than two folders below a range. The site ` +
        'shows a range, its sub ranges and their products, no deeper, so these are skipped ' +
        'rather than filed somewhere they do not belong. Move the folder up one level.',
    });
  }

  for (const [dir, entry] of itemsByDir) {
    issues.push({
      path: dir,
      reason:
        `Every photograph in "${dir.split('/').pop()}" names its own item, so its ${entry.files} ` +
        `file(s) were imported as ${entry.items.size} product(s), each named exactly as the file ` +
        'is, except a phone or export name, which gets a placeholder such as "Gold Handle 34D0" to ' +
        'rename in the dashboard. Prices are entered in the dashboard. A second photograph of the ' +
        'same item joins it ' +
        'when the filename repeats the name with a 2 after it. Any earlier single ' +
        `"${titleise(dir.split('/').pop()!)}" product holding every photograph is unpublished.`,
    });
  }

  for (const [folder, count] of finishByFolder) {
    const noun = SPLIT_BY_FINISH.get(folder.toUpperCase())!;
    issues.push({
      path: folder,
      reason:
        `The ${count} photograph(s) in "${folder}" carry phone names, so each is imported as its ` +
        `own product, "${noun} ${finishExample.get(folder)}" after its photo number, filed under a sub range by the ` +
        `finish read from the photograph (Black ${titleise(folder)}, Silver ${titleise(folder)}, ` +
        `Gold ${titleise(folder)}). One whose finish is unclear stays in ${titleise(folder)} ` +
        'itself. Set each code, name and price in the dashboard, move any that were misread, ' +
        'and delete repeat photographs of the same item; the import never undoes those edits. ' +
        `The earlier single "${titleise(folder)}" product is unpublished.`,
    });
  }

  for (const [folder, count] of photoByFolder) {
    // What Beco would call one of them: "stone", "panel", "accessory".
    const example = photoExample.get(folder)!;
    const thing = (example.split(' ').slice(-2, -1)[0] ?? 'item').toLowerCase();
    const leafName = titleise(folder.split('/').pop()!);
    issues.push({
      path: folder,
      reason:
        `The ${count} photograph(s) in "${folder}" carry phone names, so each is imported as its ` +
        `own product, "${example}" after its photo number, in ${leafName}. ` +
        `Set each ${thing}'s name in the dashboard catalogue, which the import never undoes, and ` +
        `delete repeat photographs of the same ${thing}. (A photograph renamed in Drive after its ` +
        `${thing} is also named after it on the next import.) The earlier single ` +
        `"${leafName}" product is unpublished.`,
    });
  }

  // One issue per folder, not per file.
  for (const [folder, count] of looseByFolder) {
    if (NON_PRODUCT_FOLDERS.has(folder.toUpperCase())) continue;
    issues.push({
      path: folder || '(root)',
      reason: looseImported.has(folder)
        ? `${count} file(s) sit directly in "${folder}" with no product folder, so there is ` +
          `no way to tell which photographs belong to which item. Imported as ONE product, ` +
          `"${titleise(folder)}", every photograph carrying the category's own name instead ` +
          'of its own. Create one folder per product inside it, named exactly as the product ' +
          'should appear on the site, and move the photographs in, to give each item its own ' +
          'listing. Or name each photograph after the item it shows, and each becomes its own product.'
        : `${count} file(s) sit directly in "${folder || 'the root'}" with no category folder to belong to, ` +
          'so there is nothing to import this against at all. Move the photographs into a real ' +
          'category folder, then into one folder per product inside it.',
    });
  }

  return {
    files,
    issues,
    mixed,
    misnests,
    looseFolders: [...looseByFolder]
      .filter(([f]) => f && !NON_PRODUCT_FOLDERS.has(f.toUpperCase()))
      .map(([folder, count]) => ({ folder, count })),
    itemFolders: [...itemsByDir].map(([folder, entry]) => ({
      folder,
      items: entry.items.size,
      files: entry.files,
    })),
    finishFolders: [...finishByFolder].map(([folder, count]) => ({ folder, count })),
    photoFolders: [...photoByFolder].map(([folder, count]) => ({ folder, count })),
    copies: [...copyCounts.values()],
    galleryFiles: [...looseByFolder]
      .filter(([f]) => NON_PRODUCT_FOLDERS.has(f.toUpperCase()))
      .reduce((n, [, c]) => n + c, 0),
    counts: summarise(classified),
    productsWithoutSlab: [...slabByProduct].filter(([, has]) => !has).map(([slug]) => slug),
    productsWithUnknowns: [...unknownByProduct.keys()],
  };
};
