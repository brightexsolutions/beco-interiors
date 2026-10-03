/**
 * The one check every photograph upload runs before sharp sees a byte, for
 * product photos and blog covers alike. sharp would reject a non-image on its
 * own, but only after reading the whole file into memory, and a 400MB upload
 * from a phone that chose the wrong file should be turned away by its size,
 * with a message that says so, not by an out-of-memory error.
 *
 * An empty `type` passes: some phones hand over HEIC with no MIME type at all,
 * and sharp is the authority on whether the bytes are a picture.
 */
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/** The message to show, or null when the file may go on to processing. */
export const photoUploadProblem = (file: unknown): string | null => {
  if (!(file instanceof File) || file.size === 0) return 'Choose a photograph first.';
  if (file.size > MAX_PHOTO_BYTES) return 'That photograph is larger than 12MB. Compress it and try again.';
  if (file.type && !ALLOWED_PHOTO_TYPES.has(file.type)) return 'Use a JPEG, PNG or WebP photograph.';
  return null;
};
