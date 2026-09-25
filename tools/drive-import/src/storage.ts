import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/** R2. 10GB free with free egress, against Supabase Storage's 1GB. See D16. */
export const createStorage = () => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error('R2 credentials incomplete. See docs/SETUP.md 2.2');
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  return {
    /** `sintered-stones-12mm/limestone-ivory/slab-800.webp` */
    upload: async (key: string, body: Buffer, contentType: string) => {
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Immutable: the key changes when the content does, so a year is safe
        // and means the edge never revalidates.
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return key;
    },
  };
};
