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
