import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
