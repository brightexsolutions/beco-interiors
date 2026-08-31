import { classify, summarise, type Classified, type DriveFile, type KnownFile } from './classify';
import { detectMisnests, misnestedPaths, type FolderNode, type Misnest } from './misnest';
import { resolveRole } from './roles';
import { slugify, titleise } from './slug';
import type { ImageRole } from '@beco/types';

/**
 * Turns a Drive listing into a plan: what to import, what to skip, and why.
 *
 * Pure. No network, no database, no filesystem. That is what makes the
 * pipeline's judgement testable rather than only its plumbing.
 */

export interface PlannedFile {
  driveFileId: string;
  path: string;
  categorySlug: string;
  productSlug: string;
  productName: string;
  role: ImageRole;
  outcome: Classified['outcome'];
  /** Only new and changed files are downloaded. Everything else is metadata. */
  needsDownload: boolean;
}

export interface Issue {
  path: string;
  reason: string;
}

export interface ImportPlan {
  files: PlannedFile[];
  issues: Issue[];
  misnests: Misnest[];
  /** Category folders whose files have no product folder to belong to. */
  looseFolders: Array<{ folder: string; count: number }>;
  /** Gallery and brand files, correctly loose, handled elsewhere. */
  galleryFiles: number;
  counts: ReturnType<typeof summarise>;
  /** Products where no file resolved to a slab shot. */
  productsWithoutSlab: string[];
  /** Products carrying at least one file we could not place. */
  productsWithUnknowns: string[];
}

const IGNORE = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i;

/**
 * Folders that are NOT product categories. They hold gallery and brand
 * material, so loose files in them are correct rather than a mistake, and
 * reporting them as errors would bury the real problems.
 */
const NON_PRODUCT_FOLDERS = new Set([
  'SITE PHOTOS', 'SITE VIDEOS', 'BRAND IDENTITY', 'BECO BACKUPS',
]);

export const buildPlan = (
  listing: readonly DriveFile[],
  folders: readonly FolderNode[],
  known: readonly KnownFile[],
  opts: { force?: boolean } = {},
): ImportPlan => {
  const misnests = detectMisnests(folders);
  const excluded = misnestedPaths(misnests);
  const issues: Issue[] = misnests.map((m) => ({ path: m.path, reason: m.reason }));

  // Folder paths from `folders` are CATEGORY relative ("AMBER JADE/CYPRUS
  // LIGHT GREY") while file paths are ROOT relative ("12MM SINTERED
  // STONES/AMBER JADE/..."). Compare on the category relative portion so the
  // two agree, rather than silently never matching.
  const categoryRelative = (path: string): string =>
    path.split('/').slice(1).join('/');

  const usable = listing.filter((f) => {
    if (IGNORE.test(f.path)) return false;
    const rel = categoryRelative(f.path);
    // Anything under a misnested folder is skipped along with its parent.
    for (const bad of excluded) if (rel === bad || rel.startsWith(`${bad}/`)) return false;
    return true;
  });

  const classified = classify(usable, known);
  const files: PlannedFile[] = [];
  const slabByProduct = new Map<string, boolean>();
  const unknownByProduct = new Map<string, boolean>();
  /** Category folders holding files directly, with no product folder. */
  const looseByFolder = new Map<string, number>();

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
    const top = segments[0] ?? '';

    // Gallery and brand folders are handled elsewhere, not as products.
    if (NON_PRODUCT_FOLDERS.has(top.toUpperCase())) {
      looseByFolder.set(top, (looseByFolder.get(top) ?? 0) + 1);
      continue;
    }

    if (segments.length < 3) {
      // Counted per folder and reported ONCE. Repeating this 157 times for a
      // single folder buries the actual problems in noise.
      looseByFolder.set(top, (looseByFolder.get(top) ?? 0) + 1);
      continue;
    }

    const [categoryFolder, productFolder, ...rest] = segments as [string, string, ...string[]];
    const filename = rest[rest.length - 1]!;
    const role = resolveRole(filename, productFolder);
    const productSlug = slugify(productFolder);

    if (role === 'slab') slabByProduct.set(productSlug, true);
    if (!slabByProduct.has(productSlug)) slabByProduct.set(productSlug, false);

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
      driveFileId: 'id' in c.file ? c.file.id : c.file.driveFileId,
      path: c.file.path,
      categorySlug: slugify(categoryFolder),
      productSlug,
      productName: titleise(productFolder),
      role,
      outcome: c.outcome,
      // Only new and changed files are fetched. A rename re resolves its role
      // from metadata and never re downloads 44MB.
      // `force` re-downloads and re-encodes everything, for when the pipeline
      // itself changed rather than the source. Without it, a fix to the
      // encoder never reaches files already marked unchanged.
      needsDownload: opts.force || c.outcome === 'new' || c.outcome === 'changed',
    });
  }

  // One issue per folder, not per file.
  for (const [folder, count] of looseByFolder) {
    if (NON_PRODUCT_FOLDERS.has(folder.toUpperCase())) continue;
    issues.push({
      path: folder,
      reason:
        `${count} file(s) sit directly in "${folder}" with no product folder, so there is ` +
        'nothing to name a product after and no way to tell which photographs belong ' +
        'together. Create one folder per product inside it, named exactly as the product ' +
        'should appear on the site, and move the photographs in.',
    });
  }

  return {
    files,
    issues,
    misnests,
    looseFolders: [...looseByFolder]
      .filter(([f]) => !NON_PRODUCT_FOLDERS.has(f.toUpperCase()))
      .map(([folder, count]) => ({ folder, count })),
    galleryFiles: [...looseByFolder]
      .filter(([f]) => NON_PRODUCT_FOLDERS.has(f.toUpperCase()))
      .reduce((n, [, c]) => n + c, 0),
    counts: summarise(classified),
    productsWithoutSlab: [...slabByProduct].filter(([, has]) => !has).map(([slug]) => slug),
    productsWithUnknowns: [...unknownByProduct.keys()],
  };
};
