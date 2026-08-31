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
  counts: ReturnType<typeof summarise>;
  /** Products where no file resolved to a slab shot. */
  productsWithoutSlab: string[];
  /** Products carrying at least one file we could not place. */
  productsWithUnknowns: string[];
}

const IGNORE = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i;

export const buildPlan = (
  listing: readonly DriveFile[],
  folders: readonly FolderNode[],
  known: readonly KnownFile[],
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
    if (segments.length < 3) {
      issues.push({
        path: c.file.path,
        reason:
          'Expected CATEGORY/PRODUCT/file. A file directly inside a category folder has ' +
          'no product to belong to, so it is skipped rather than guessed at.',
      });
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
      needsDownload: c.outcome === 'new' || c.outcome === 'changed',
    });
  }

  return {
    files,
    issues,
    misnests,
    counts: summarise(classified),
    productsWithoutSlab: [...slabByProduct].filter(([, has]) => !has).map(([slug]) => slug),
    productsWithUnknowns: [...unknownByProduct.keys()],
  };
};
