import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Makes a buffer Sharp can actually read.
 *
 * Sharp's prebuilt binary reports `format.heif.input.buffer` as true and then
 * fails on every real iPhone HEIC, because the build ships without an HEVC
 * decoder. That is not a corrupt file problem: it is every photograph taken on
 * an iPhone with default settings, and Beco's hardware photography is all of
 * them. 126 files were skipped on the run that added office accessories.
 *
 * macOS reads HEIC natively through `sips`, so on darwin we transcode to PNG
 * first and hand Sharp something it understands. PNG rather than JPEG because
 * this is an intermediate: the real encode happens downstream and should not
 * compound a lossy step.
 *
 * On Linux, which is what CI runs, `sips` does not exist. The caller gets a
 * clear failure rather than a silent skip, and the fix there is a Sharp build
 * with libheif. Recorded in docs/PLAN.md.
 */
/**
 * Detected from the BYTES, not the filename.
 *
 * The filename was the obvious signal and it was the wrong one: the path
 * carried through the pipeline is not always the leaf file, so extension
 * matching silently returned false and every HEIC went to Sharp untouched.
 *
 * HEIF files are ISO base media: a length, then the ASCII box type `ftyp`,
 * then a four character brand. The HEIC brands are heic, heix, hevc, heim,
 * heis, hevm, hevs and the generic mif1 and msf1.
 */
const HEIF_BRANDS = new Set([
  'heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1',
]);

export const isHeic = (body: Buffer): boolean => {
  if (body.length < 12) return false;
  if (body.toString('ascii', 4, 8) !== 'ftyp') return false;
  return HEIF_BRANDS.has(body.toString('ascii', 8, 12).toLowerCase());
};

export class HeicUnsupportedError extends Error {
  constructor(filename: string) {
    super(
      `${filename} is HEIC and this platform cannot decode it. ` +
        'macOS converts with sips; Linux needs a Sharp build with libheif.',
    );
    this.name = 'HeicUnsupportedError';
  }
}

/**
 * Returns a decodable buffer. For anything but HEIC this is the input
 * unchanged, so the common path costs nothing.
 */
export const toDecodable = (body: Buffer, filename: string): Buffer => {
  if (!isHeic(body)) return body;
  if (process.platform !== 'darwin') throw new HeicUnsupportedError(filename);

  const dir = mkdtempSync(join(tmpdir(), 'beco-heic-'));
  try {
    const src = join(dir, 'in.heic');
    const out = join(dir, 'out.png');
    writeFileSync(src, body);
    execFileSync('sips', ['-s', 'format', 'png', src, '--out', out], {
      stdio: 'ignore',
    });
    return readFileSync(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
