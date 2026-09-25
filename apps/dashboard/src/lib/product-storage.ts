import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PRODUCT_IMAGE_WIDTHS } from '@/lib/product-photo';

const missingStorageMessage =
  'Photograph storage is not configured. Add the R2 keys, then try again.';

const credentials = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(missingStorageMessage);
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
};

const client = () => {
  const { accountId, accessKeyId, secretAccessKey } = credentials();
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
};

export function isProductStorageConfigured(): boolean {
  try {
    credentials();
    return true;
  } catch {
    return false;
  }
}

/** Keys the image proxy will fetch. Rejects traversal even though R2 would. */
export const isSafeR2Key = (key: string): boolean =>
  key.length > 0 && !key.includes('..') && !key.startsWith('/') && !key.includes('\\');

export async function getProductObject(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  if (!isSafeR2Key(key)) return null;
  try {
    const { bucket } = credentials();
    const obj = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await obj.Body!.transformToByteArray();
    return { body, contentType: obj.ContentType ?? 'image/webp' };
  } catch {
    return null;
  }
}

export async function uploadProductObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { bucket } = credentials();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

export async function deleteProductDerivatives(stem: string): Promise<void> {
  const { bucket } = credentials();
  const s3 = client();
  await Promise.all(
    PRODUCT_IMAGE_WIDTHS.map((width) =>
      s3
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: `${stem}-${width}.webp` }))
        .catch(() => undefined),
    ),
  );
}

export async function uploadProductDerivatives(
  stem: string,
  derivatives: readonly { width: number; body: Buffer }[],
): Promise<void> {
  await Promise.all(
    derivatives.map((derivative) =>
      uploadProductObject(`${stem}-${derivative.width}.webp`, derivative.body, 'image/webp'),
    ),
  );
}
