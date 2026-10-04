'use server';

import { stagedUploadRequestSchema, type UploadArea } from '@beco/validation';
import { requirePath } from '@/lib/session';
import { createStagedUpload, isProductStorageConfigured } from '@/lib/product-storage';

export type StagedUploadResult = { key: string; url: string; error?: undefined } | { key?: undefined; url?: undefined; error: string };

/**
 * Sign a direct upload for a photograph. The caller must hold the dashboard
 * area the photograph is for, products for a product shot, users for a team
 * photo, studio/blog for a cover, the same gate the finishing action applies.
 * The URL puts one object under `uploads/` and nothing else, and it expires
 * in five minutes. D116.
 */
export async function createPhotoUpload(input: { area: UploadArea; size: number; type: string }): Promise<StagedUploadResult> {
  const parsed = stagedUploadRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the photograph, then try again.' };
  await requirePath(`/${parsed.data.area}`);
  if (!isProductStorageConfigured()) {
    return { error: 'Photograph storage is not configured. Add the R2 keys, then try again.' };
  }
  try {
    return await createStagedUpload(parsed.data.type);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not start that upload.' };
  }
}
