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
  if (filenames.length < 2) return false;
  if (filenames.some((name) => isCameraName(name))) return false;
  if (filenames.some((name) => resolveRole(name, folderName) !== 'unknown')) return false;
  const subjects = new Set(filenames.map((name) => subjectOf(itemNameOf(name), folderName)).filter(Boolean));
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
      const productSlug = claimSlug(slugify(itemName), productPath, dirs[dirs.length - 1]!);
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
        productName: titleiseItem(itemName),
        role: seen === 0 ? 'slab' : 'application',
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
        'is. Prices are entered in the dashboard. A second photograph of the same item joins it ' +
        'when the filename repeats the name with a 2 after it.',
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
    galleryFiles: [...looseByFolder]
      .filter(([f]) => NON_PRODUCT_FOLDERS.has(f.toUpperCase()))
      .reduce((n, [, c]) => n + c, 0),
    counts: summarise(classified),
    productsWithoutSlab: [...slabByProduct].filter(([, has]) => !has).map(([slug]) => slug),
    productsWithUnknowns: [...unknownByProduct.keys()],
  };
};
