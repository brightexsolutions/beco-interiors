import 'server-only';
import { photoUploadProblem } from '@/lib/photo-upload';
import { takeStagedUpload } from '@/lib/product-storage';

/**
 * The bytes of a photograph a form handed to a finishing action, from either
 * of the two ways they can arrive. The usual way is an `uploadKey`, the staged
 * object the browser PUT straight into R2 (D116). The fallback is the file
 * itself in the form post, which the browser uses only when the direct upload
 * failed and the file is small enough to fit Vercel's request body cap.
 */
export type PhotoUpload = { buffer: Buffer; error?: undefined } | { buffer?: undefined; error: string };

export async function readPhotoUpload(
  form: FormData,
  field = 'photo',
): Promise<PhotoUpload> {
  const uploadKey = String(form.get('uploadKey') ?? '');
  if (uploadKey) {
    try {
      return { buffer: await takeStagedUpload(uploadKey) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'That upload did not arrive. Choose the photograph again.' };
    }
  }
  const file = form.get(field);
  const problem = photoUploadProblem(file);
  if (problem || !(file instanceof File)) return { error: problem ?? 'Choose a photograph first.' };
  return { buffer: Buffer.from(await file.arrayBuffer()) };
}
