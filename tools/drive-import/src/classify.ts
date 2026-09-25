import type { ImageRole } from '@beco/types';

/**
 * Five outcome classification, diffing Drive against `import_files`.
 *
 * Drive gives an md5 for binary files, so "has this photograph actually
 * changed" is answerable WITHOUT downloading it. That is what makes the
 * pipeline cheap to run often.
 */
export type Outcome = 'new' | 'changed' | 'moved' | 'unchanged' | 'missing';

export interface DriveFile {
  id: string;
  path: string;
  md5: string | null;
  size: number;
  modifiedTime: string;
}

export interface KnownFile {
  driveFileId: string;
  path: string;
  md5: string | null;
  role: ImageRole | null;
  productId: string | null;
}

export interface Classified {
  outcome: Outcome;
  file: DriveFile | KnownFile;
  /** Set when a file moved, so the report can say where from. */
  previousPath?: string;
}

/**
 * Compares a Drive listing against what we have seen before.
 *
 * A file present in `known` but absent from `listing` is **missing, and is
 * only ever flagged**. It is never auto deleted: a vanished file is at least
 * as likely to be an accidental drag as an intent, and this dataset has
 * already proved folders get moved by mistake.
 */
export const classify = (
  listing: readonly DriveFile[],
  known: readonly KnownFile[],
): Classified[] => {
  const knownById = new Map(known.map((k) => [k.driveFileId, k]));
  const seen = new Set<string>();
  const out: Classified[] = [];

  for (const file of listing) {
    seen.add(file.id);
    const prior = knownById.get(file.id);

    if (!prior) {
      out.push({ outcome: 'new', file });
      continue;
    }
    // md5 first: content changing matters more than location changing.
    if (file.md5 !== null && prior.md5 !== null && file.md5 !== prior.md5) {
      out.push({ outcome: 'changed', file });
      continue;
    }
    if (file.path !== prior.path) {
      // Same id, different path. Re resolve role, do NOT re download.
      out.push({ outcome: 'moved', file, previousPath: prior.path });
      continue;
    }
    out.push({ outcome: 'unchanged', file });
  }

  for (const prior of known) {
    if (!seen.has(prior.driveFileId)) {
      out.push({ outcome: 'missing', file: prior });
    }
  }

  return out;
};

export const summarise = (classified: readonly Classified[]): Record<Outcome, number> => {
  const counts: Record<Outcome, number> = {
    new: 0, changed: 0, moved: 0, unchanged: 0, missing: 0,
  };
  for (const c of classified) counts[c.outcome]++;
  return counts;
};
