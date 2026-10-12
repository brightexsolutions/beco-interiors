import { z } from 'zod';

/**
 * A photograph upload is staged straight from the browser into R2 under a
 * short lived presigned URL, then finished by the server action that owns the
 * record (product, team member, blog cover). The browser never talks to Vercel
 * with the file, so Vercel's 4.5MB request body cap never applies. D116.
 *
 * The size and type limits live here so the browser check, the presign action
 * and the finishing action all read one number.
 */
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

/**
 * What the browser will take from the camera roll before it resizes, D139.
 * A phone photograph is 4 to 12MB and a HEIC burst can be more; the browser
 * decodes it, scales it to `PHOTO_LONG_EDGE` and sends a JPEG of a megabyte
 * or two, so this is the ceiling on what it will attempt, not on what
 * travels. `MAX_PHOTO_BYTES` above is what travels.
 */
export const MAX_PHOTO_INPUT_BYTES = 40 * 1024 * 1024;
export const PHOTO_LONG_EDGE = 2400;
/** Above this the browser re-encodes even a file that is already small enough on its long edge. */
export const PHOTO_REENCODE_BYTES = 1536 * 1024;
export const PHOTO_JPEG_QUALITY = 0.86;

export const ALLOWED_PHOTO_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/** The dashboard areas that take a photograph, keyed by the route the caller must hold. */
export const UPLOAD_AREAS = ['products', 'users', 'studio/blog'] as const;
export type UploadArea = (typeof UPLOAD_AREAS)[number];

export const stagedUploadRequestSchema = z.object({
  area: z.enum(UPLOAD_AREAS),
  size: z
    .number()
    .int()
    .positive('Choose a photograph first.')
    .max(MAX_PHOTO_BYTES, 'That photograph is larger than 12MB. Compress it and try again.'),
  type: z
    .string()
    .max(100)
    .refine((type) => type === '' || ALLOWED_PHOTO_TYPES.has(type), 'Use a JPEG, PNG or WebP photograph.'),
});
export type StagedUploadRequest = z.infer<typeof stagedUploadRequestSchema>;

/** Staged objects live under one prefix with a random name, nothing else is ever signed. */
export const STAGED_UPLOAD_PREFIX = 'uploads/';
export const isStagedUploadKey = (key: string): boolean => /^uploads\/[0-9a-f]{32}$/.test(key);
