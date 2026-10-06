import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from '@beco/validation';

export { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES };

/**
 * The one check every photograph upload runs before sharp sees a byte, for
 * product photos, team photos and blog covers alike. It runs in the browser
 * before a direct upload is signed, and again on the server for the form post
 * fallback. sharp would reject a non-image on its own, but only after reading
 * the whole file into memory, and a 400MB upload from a phone that chose the
 * wrong file should be turned away by its size, with a message that says so,
 * not by an out-of-memory error.
 *
 * An empty `type` passes: some phones hand over HEIC with no MIME type at all,
 * and sharp is the authority on whether the bytes are a picture.
 */
export const photoUploadProblem = (file: unknown): string | null => {
  if (!(file instanceof File) || file.size === 0) return 'Choose a photograph first.';
  if (file.size > MAX_PHOTO_BYTES) return 'That photograph is larger than 12MB. Compress it and try again.';
  if (file.type && !ALLOWED_PHOTO_TYPES.has(file.type)) return 'Use a JPEG, PNG or WebP photograph.';
  return null;
};
