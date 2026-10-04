import { randomBytes } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, STAGED_UPLOAD_PREFIX, isStagedUploadKey } from '@beco/validation';
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

/** How long a browser has to finish its PUT once the URL is signed. */
export const STAGED_UPLOAD_TTL_SECONDS = 300;

/**
 * Sign one PUT for a fresh key under `uploads/`. The browser sends the file
 * there directly, so Vercel never carries the bytes and its 4.5MB request body
 * cap does not apply. D116. Only the content type is signed: a browser cannot
 * be made to send a signed Content-Length, so the size is enforced when the
 * finishing action takes the object, not here.
 */
export async function createStagedUpload(contentType: string): Promise<{ key: string; url: string }> {
  const { bucket } = credentials();
  const key = `${STAGED_UPLOAD_PREFIX}${randomBytes(16).toString('hex')}`;
  // The presigner's Client type and S3Client disagree under
  // exactOptionalPropertyTypes. They are the same object at runtime.
  const url = await getSignedUrl(
    client() as unknown as Parameters<typeof getSignedUrl>[0],
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType || undefined }),
    { expiresIn: STAGED_UPLOAD_TTL_SECONDS },
  );
  return { key, url };
}

/**
 * Read a staged upload back for processing and delete it whatever happens.
 * The key must be one this server could have signed, the size and type are
 * re-checked against the object R2 actually holds, and the staging object
 * never outlives the request that consumes it. A lifecycle rule on the
 * bucket sweeps the ones a browser abandoned, see docs/DEPLOYMENT.md 3.6.
 */
export async function takeStagedUpload(key: string): Promise<Buffer> {
  if (!isStagedUploadKey(key)) throw new Error('That upload is not one we signed. Choose the photograph again.');
  const { bucket } = credentials();
  const s3 = client();
  const discard = () => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => undefined);
  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    throw new Error('That upload did not arrive. Choose the photograph again.');
  }
  if ((head.ContentLength ?? 0) === 0) {
    await discard();
    throw new Error('Choose a photograph first.');
  }
  if ((head.ContentLength ?? 0) > MAX_PHOTO_BYTES) {
    await discard();
    throw new Error('That photograph is larger than 12MB. Compress it and try again.');
  }
  if (head.ContentType && head.ContentType !== 'application/octet-stream' && !ALLOWED_PHOTO_TYPES.has(head.ContentType)) {
    await discard();
    throw new Error('Use a JPEG, PNG or WebP photograph.');
  }
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return Buffer.from(await obj.Body!.transformToByteArray());
  } finally {
    await discard();
  }
}
