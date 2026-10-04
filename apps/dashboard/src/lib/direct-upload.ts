import type { UploadArea } from '@beco/validation';
import { photoUploadProblem } from '@/lib/photo-upload';

/**
 * The browser half of a direct photograph upload. D116.
 *
 * 1. Ask the server to sign a PUT for a staging key.
 * 2. PUT the file straight to R2, reporting progress.
 * 3. Hand the staging key to the finishing action instead of the file.
 *
 * When the PUT fails (the bucket CORS rule missing, a flaky connection), a
 * file small enough for Vercel's request body cap goes the old way, inside
 * the form post. A larger one cannot, and the person is told that plainly.
 */

/** Vercel accepts request bodies up to 4.5MB. Stay under it with room for the other fields. */
export const DIRECT_UPLOAD_FALLBACK_BYTES = 4 * 1024 * 1024;

export type PresignPhoto = (input: { area: UploadArea; size: number; type: string }) => Promise<
  { key: string; url: string; error?: undefined } | { key?: undefined; url?: undefined; error: string }
>;

export type PutFile = (url: string, file: File, onProgress: (fraction: number) => void) => Promise<void>;

/** XMLHttpRequest rather than fetch, because only it reports upload progress. */
export const putFile: PutFile = (url, file, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(file);
  });

export type StagedPhoto =
  | { kind: 'staged'; key: string }
  | { kind: 'fallback' }
  | { kind: 'error'; error: string };

export const megabytes = (bytes: number): string => `${(bytes / 1048576).toFixed(1)}MB`;

/**
 * Stage one file. Returns the key to send instead of the file, or `fallback`
 * when the file should travel in the form post after all, or an error to show.
 */
export async function stagePhoto(
  file: unknown,
  area: UploadArea,
  presign: PresignPhoto,
  onProgress: (fraction: number) => void,
  put: PutFile = putFile,
): Promise<StagedPhoto> {
  const problem = photoUploadProblem(file);
  if (problem || !(file instanceof File)) return { kind: 'error', error: problem ?? 'Choose a photograph first.' };

  const signed = await presign({ area, size: file.size, type: file.type });
  if (signed.error !== undefined) return { kind: 'error', error: signed.error };

  try {
    await put(signed.url, file, onProgress);
    return { kind: 'staged', key: signed.key };
  } catch {
    if (file.size <= DIRECT_UPLOAD_FALLBACK_BYTES) return { kind: 'fallback' };
    return {
      kind: 'error',
      error: `The direct upload failed and ${megabytes(file.size)} is too large to send the slow way. Check the connection and try again.`,
    };
  }
}
