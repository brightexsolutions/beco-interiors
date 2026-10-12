import { MAX_PHOTO_INPUT_BYTES, PHOTO_JPEG_QUALITY, PHOTO_LONG_EDGE, PHOTO_REENCODE_BYTES } from '@beco/validation';
import { megabytes } from '@/lib/file-size';

/**
 * Make a phone photograph small before it leaves the phone, D139.
 *
 * The upload that kept failing was a 9.5MB camera roll JPEG: the direct PUT
 * to R2 dropped on Nairobi mobile data, and 9.5MB is over the 4MB the form
 * post fallback can carry, so the person was stuck with a message and no
 * way through. The server resized every photograph to 1600px anyway, so
 * most of those bytes were thrown away after the slowest part of the trip.
 *
 * Now the browser decodes the file (an iPhone HEIC through libheif in
 * WebAssembly, anything else through the browser's own decoder), scales it
 * to `PHOTO_LONG_EDGE` on its long edge and encodes a JPEG. A 12MB HEIC
 * becomes about a megabyte, which goes direct in seconds and fits the
 * fallback when it does not. The server's own resize and WebP encode run
 * unchanged on what arrives.
 *
 * Decoding and encoding are injectable so the logic is tested in jsdom,
 * which has no canvas and no `createImageBitmap`.
 */

export interface PreparedImage {
  file: File;
  width: number;
  height: number;
  /** True when the bytes changed: decoded from HEIC, scaled, or re-encoded. */
  changed: boolean;
}

export interface Decoded {
  width: number;
  height: number;
  /** Draws the decoded picture into a canvas at the given size. */
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  close?: () => void;
}

export interface ImageCodecs {
  /** HEIC or HEIF bytes to a JPEG blob. */
  heicToJpeg: (file: Blob) => Promise<Blob>;
  decode: (blob: Blob) => Promise<Decoded>;
  encode: (decoded: Decoded, width: number, height: number, quality: number) => Promise<Blob>;
}

export type PreparePhase = 'decoding' | 'resizing';

const HEIC_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);

/** HEIC by declared type, or by name when the phone declared nothing. */
export const isHeicFile = (file: File): boolean =>
  HEIC_TYPES.has(file.type.toLowerCase()) || (!file.type && /\.hei[cf]$/i.test(file.name)) || /\.hei[cf]$/i.test(file.name);

/** The one check before any decoding: is this something we will even try. */
export const photoInputProblem = (file: unknown): string | null => {
  if (!(file instanceof File) || file.size === 0) return 'Choose a photograph first.';
  if (file.size > MAX_PHOTO_INPUT_BYTES) {
    return `${file.name} is ${megabytes(file.size)}, over the 40MB we can take. Send a smaller copy.`;
  }
  if (file.type && !file.type.startsWith('image/')) return `${file.name} is not a photograph.`;
  return null;
};



/** The scaled size: long edge capped, aspect kept, never enlarged. */
export const fitWithin = (width: number, height: number, longEdge: number): { width: number; height: number } => {
  const longest = Math.max(width, height);
  if (longest <= longEdge) return { width, height };
  const scale = longEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

const stem = (name: string): string => name.replace(/\.[^.]+$/, '') || 'photo';

const browserCodecs = (): ImageCodecs => ({
  heicToJpeg: async (file) => {
    // 3MB of WebAssembly, loaded only when a HEIC is actually chosen.
    const { heicTo } = await import('heic-to/csp');
    return heicTo({ blob: file, type: 'image/jpeg', quality: 0.95 });
  },
  decode: async (blob) => {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        close: () => bitmap.close(),
      };
    }
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('decode failed'));
        element.src = url;
      });
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
        close: () => URL.revokeObjectURL(url),
      };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  },
  encode: async (decoded, width, height, quality) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no canvas');
    decoded.draw(context, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('encode failed');
    return blob;
  },
});

export class HeicDecodeError extends Error {
  constructor(name: string) {
    super(`Could not read ${name}. On an iPhone, set Camera, Formats to Most Compatible, or share the photo as a JPEG, then try again.`);
    this.name = 'HeicDecodeError';
  }
}

/**
 * Decode, scale and re-encode when it pays; hand the original back when it
 * is already a small JPEG, PNG or WebP. A HEIC that cannot be decoded is an
 * error with a way out, never a silent pass through: the server cannot read
 * it either.
 */
export async function prepareImage(
  file: File,
  options: {
    longEdge?: number;
    quality?: number;
    reencodeAbove?: number;
    onPhase?: (phase: PreparePhase) => void;
    codecs?: ImageCodecs;
  } = {},
): Promise<PreparedImage> {
  const longEdge = options.longEdge ?? PHOTO_LONG_EDGE;
  const quality = options.quality ?? PHOTO_JPEG_QUALITY;
  const reencodeAbove = options.reencodeAbove ?? PHOTO_REENCODE_BYTES;
  const codecs = options.codecs ?? browserCodecs();
  const heic = isHeicFile(file);

  let source: Blob = file;
  if (heic) {
    options.onPhase?.('decoding');
    try {
      source = await codecs.heicToJpeg(file);
    } catch {
      throw new HeicDecodeError(file.name);
    }
  }

  let decoded: Decoded;
  try {
    options.onPhase?.('decoding');
    decoded = await codecs.decode(source);
  } catch {
    if (heic) throw new HeicDecodeError(file.name);
    // The browser could not decode it, so leave the bytes alone: sharp on
    // the server is the authority on whether it is a picture at all.
    return { file, width: 0, height: 0, changed: false };
  }

  try {
    const target = fitWithin(decoded.width, decoded.height, longEdge);
    const scaled = target.width !== decoded.width || target.height !== decoded.height;
    const needsEncode = heic || scaled || source.size > reencodeAbove || !/^image\/(jpeg|png|webp)$/.test(file.type);
    if (!needsEncode) {
      return { file, width: decoded.width, height: decoded.height, changed: false };
    }
    options.onPhase?.('resizing');
    const blob = await codecs.encode(decoded, target.width, target.height, quality);
    // A re-encode that grew the file (a flat PNG, say) is not an improvement.
    if (!heic && !scaled && blob.size >= file.size) {
      return { file, width: decoded.width, height: decoded.height, changed: false };
    }
    const prepared = new File([blob], `${stem(file.name)}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
    return { file: prepared, width: target.width, height: target.height, changed: true };
  } finally {
    decoded.close?.();
  }
}

export { megabytes };
