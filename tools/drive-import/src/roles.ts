import type { ImageRole } from '@beco/types';

/**
 * Resolve an image role from a filename.
 *
 * Matches on the TOKEN SET, not the token order, so `SLAB ON STAND`,
 * `STAND ON SLAB` and `STONE ON SLAB` all resolve to the same role.
 * That one rule removes a whole class of failure seen in the real export.
 *
 * A filename matching NOTHING resolves to `unknown`. It is never guessed
 * into a role, because a wrong hero image is worse than a flagged one.
 */

const normalise = (filename: string): Set<string> => {
  const stem = filename.replace(/\.[^.]+$/, '');
  return new Set(
    stem
      .toUpperCase()
      .replace(/[_\-.]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
};

const hasAll = (tokens: Set<string>, required: string[]) => required.every((r) => tokens.has(r));

export const resolveRole = (filename: string, folderName: string): ImageRole => {
  const tokens = normalise(filename);

  // On stand: any order of these three words.
  if (hasAll(tokens, ['ON', 'STAND']) || hasAll(tokens, ['ON', 'SLAB'])) {
    if (tokens.has('SLAB') || tokens.has('STONE') || tokens.has('STAND')) return 'on_stand';
  }
  // Bookmatch: "BOOK MATCH", "BOOKMATCH", or prefixed with the product name.
  if (hasAll(tokens, ['BOOK', 'MATCH']) || tokens.has('BOOKMATCH')) return 'bookmatch';
  // Application: APP 1, APP 2.
  if (tokens.has('APP')) return 'application';
  // Slab: explicit, or the filename simply repeats the folder name.
  if (tokens.has('SLAB')) return 'slab';

  const folderTokens = normalise(folderName);
  if (folderTokens.size > 0 && [...folderTokens].every((t) => tokens.has(t))) return 'slab';

  return 'unknown';
};
