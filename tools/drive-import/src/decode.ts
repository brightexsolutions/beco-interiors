import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
 * So HEIC is transcoded to PNG first, by the platform's own tool: `sips` on
 * macOS, and on Linux `heif-convert` from libheif, which is what the
 * dashboard's import button runs on (GitHub's Ubuntu runners). Until 5
 * October Linux had no path at all, so every hinge, door lock and furniture
 * leg photograph was skipped from the button and the import had to run from
 * the Mac, D122. The workflow now installs `libheif-examples` and
 * `libheif-plugin-libde265`, the HEVC decoder libheif needs. PNG rather than
 * JPEG because this is an intermediate: the real encode happens downstream and
 * should not compound a lossy step.
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
      `${filename} is HEIC and this machine has no HEIC converter. ` +
        'macOS converts with sips; on Linux install libheif-examples and ' +
        'libheif-plugin-libde265 for heif-convert.',
    );
    this.name = 'HeicUnsupportedError';
  }
}

/** The converter and its arguments for this platform, from `src` to a PNG at `out`. */
export const heicCommand = (platform: NodeJS.Platform, src: string, out: string): [string, string[]] =>
  platform === 'darwin'
    ? ['sips', ['-s', 'format', 'png', src, '--out', out]]
    : ['heif-convert', [src, out]];

/**
 * Returns a decodable buffer. For anything but HEIC this is the input
 * unchanged, so the common path costs nothing.
 */
export const toDecodable = (
  body: Buffer,
  filename: string,
  run: (command: string, args: string[]) => void = (command, args) => {
    execFileSync(command, args, { stdio: 'ignore' });
  },
  platform: NodeJS.Platform = process.platform,
): Buffer => {
  if (!isHeic(body)) return body;

  const dir = mkdtempSync(join(tmpdir(), 'beco-heic-'));
  try {
    const src = join(dir, 'in.heic');
    const out = join(dir, 'out.png');
    writeFileSync(src, body);
    const [command, args] = heicCommand(platform, src, out);
    try {
      run(command, args);
    } catch (err) {
      // The tool is not installed: say what to install, not "spawn ENOENT".
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new HeicUnsupportedError(filename);
      throw err;
    }
    // heif-convert numbers its output when a file holds several images
    // ("out-1.png"); the primary image is the first.
    const png = readdirSync(dir).filter((f) => f.endsWith('.png')).sort()[0];
    if (!png) throw new Error(`${filename}: ${command} produced no image`);
    return readFileSync(join(dir, png));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
