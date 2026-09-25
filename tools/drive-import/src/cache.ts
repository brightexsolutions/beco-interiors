import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A local download cache, keyed by Drive file id and md5.
 *
 * `supabase db reset` wipes `import_files` along with everything else, so
 * every file then classifies as new and the pipeline re-downloads roughly a
 * gigabyte. That turns a schema change into a ten minute wait, which is a
 * good way to stop people running migrations.
 *
 * Cached in `_incoming/`, which is gitignored and already where raw source
 * lives. Keyed by md5 as well as id, so a genuinely changed file misses the
 * cache and is fetched again.
 */
const DIR = join(process.cwd(), '_incoming', 'cache');

const keyFor = (driveFileId: string, md5: string | null) =>
  createHash('sha1').update(`${driveFileId}:${md5 ?? 'nomd5'}`).digest('hex');

export const readCache = (driveFileId: string, md5: string | null): Buffer | null => {
  const path = join(DIR, keyFor(driveFileId, md5));
  return existsSync(path) ? readFileSync(path) : null;
};

export const writeCache = (driveFileId: string, md5: string | null, body: Buffer): void => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, keyFor(driveFileId, md5)), body);
};
