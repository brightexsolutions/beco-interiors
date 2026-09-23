import type { ImageRole } from '@beco/types';
import type { PlannedFile } from './plan';

/**
 * The shape written into `products.images`. A jsonb column is not
 * typechecked by Postgres, so a stored entry is read back and trusted only
 * after each field is confirmed present, never assumed. See `parseStoredImages`.
 */
export interface ImageEntry {
  role: ImageRole;
  path: string;
  alt: string;
  width: number;
  height: number;
  blur: string;
  avgColor: string;
  dominantColor: string;
  lightness: number;
  uniformBackground: boolean;
  sort: number;
  /**
   * The Drive file this entry was built from, so a later run can find it
   * again without re-downloading. Absent on rows written before this field
   * existed: those fall back to a role position match in `mergeProductImages`.
   */
  driveFileId?: string | null;
}

/** A freshly processed file, before its final position in the array is known. */
export type ProcessedImage = Omit<ImageEntry, 'sort' | 'driveFileId'> & { driveFileId: string };

/**
 * Reads `products.images` back defensively. Nothing here is guessed: a field
 * that is not the expected type is replaced with a safe default rather than
 * carried through malformed, because this array round trips into the next
 * run's merge and a bad entry there would corrupt a real product page.
 */
export const parseStoredImages = (raw: unknown): ImageEntry[] => {
  if (!Array.isArray(raw)) return [];
  const out: ImageEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.role !== 'string' || typeof e.path !== 'string') continue;
    out.push({
      role: e.role as ImageRole,
      path: e.path,
      alt: typeof e.alt === 'string' ? e.alt : '',
      width: typeof e.width === 'number' ? e.width : 0,
      height: typeof e.height === 'number' ? e.height : 0,
      blur: typeof e.blur === 'string' ? e.blur : '',
      avgColor: typeof e.avgColor === 'string' ? e.avgColor : '',
      dominantColor: typeof e.dominantColor === 'string' ? e.dominantColor : '',
      lightness: typeof e.lightness === 'number' ? e.lightness : 0,
      uniformBackground: typeof e.uniformBackground === 'boolean' ? e.uniformBackground : false,
      sort: typeof e.sort === 'number' ? e.sort : 0,
      driveFileId: typeof e.driveFileId === 'string' ? e.driveFileId : null,
    });
  }
  return out;
};

/**
 * Produces the final images array for one product: everything processed this
 * run, plus whatever existing entries are still valid but were not
 * reprocessed (unchanged or moved, so carrying the old entry forward is
 * correct and cheaper than re-deriving it), in Drive's current order.
 *
 * An existing entry whose file is not in `orderedFiles` at all is dropped:
 * that file was classified `missing` upstream (removed from Drive, or moved
 * somewhere this plan does not cover) and never entered the plan, so Drive no
 * longer vouches for it. Drive is the source of truth for which photographs
 * exist, never the database.
 *
 * `processed` and `existing` are matched by `driveFileId`, so a later run can
 * find an unchanged file's own prior entry exactly. An existing entry written
 * before that field was recorded falls back to a positional match within its
 * own role: exact whenever a role carries at most one file still waiting to
 * be matched, the overwhelmingly common case (one slab shot, one on stand
 * shot), and it drops the ambiguous remainder rather than guessing which
 * file an unmatched legacy entry belonged to.
 *
 * A file that needed downloading this run but failed to process (HEIC Sharp
 * cannot decode, a corrupt source) is not backfilled from a stale entry: it
 * is recorded in `import_issues` and simply contributes nothing, the same as
 * before this fix. Only a file Drive says is unchanged reuses old data.
 */
export const mergeProductImages = (
  orderedFiles: readonly PlannedFile[],
  processed: ReadonlyMap<string, ProcessedImage>,
  existing: readonly ImageEntry[],
): ImageEntry[] => {
  const byDriveId = new Map<string, ImageEntry>();
  const legacyByRole = new Map<ImageRole, ImageEntry[]>();
  for (const entry of existing) {
    if (entry.driveFileId) {
      byDriveId.set(entry.driveFileId, entry);
      continue;
    }
    const queue = legacyByRole.get(entry.role) ?? [];
    queue.push(entry);
    legacyByRole.set(entry.role, queue);
  }

  const merged: ImageEntry[] = [];
  orderedFiles.forEach((file, sort) => {
    const fresh = processed.get(file.driveFileId);
    if (fresh) {
      merged.push({ ...fresh, sort });
      return;
    }
    // Attempted this run and failed: reported already, never backfilled.
    if (file.needsDownload) return;

    const carried = byDriveId.get(file.driveFileId) ?? legacyByRole.get(file.role)?.shift();
    if (carried) merged.push({ ...carried, role: file.role, sort });
  });

  return merged;
};
