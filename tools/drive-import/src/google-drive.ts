import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import type { DriveSource } from './drive';
import type { DriveFile } from './classify';
import type { FolderNode } from './misnest';

/**
 * The real Drive source.
 *
 * A FULL LISTING WALK, not the changes feed. The changes feed is scoped to a
 * drive rather than a folder, and a service account reading someone else's
 * shared folder gets its own empty drive's changes. See docs/REVIEW.md 1.2.
 *
 * 24 folders and roughly 125 files is a handful of calls and takes seconds.
 * Change detection is the md5 comparison against `import_files`, which does
 * not need the changes feed to work.
 */
export const createGoogleDriveSource = (): DriveSource => {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set. See docs/SETUP.md 2.1');

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(readFileSync(keyPath, 'utf8')),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const children = async (folderId: string) => {
    const out: Array<{ id: string; name: string; mimeType: string; md5Checksum?: string | null;
                       size?: string | null; modifiedTime?: string | null }> = [];
    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id,name,mimeType,md5Checksum,size,modifiedTime)',
        pageSize: 200,
        ...(pageToken ? { pageToken } : {}),
      });
      out.push(...((res.data.files ?? []) as typeof out));
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    return out;
  };

  const isFolder = (m: string) => m === 'application/vnd.google-apps.folder';

  const walk = async (
    folderId: string, prefix: string, depth: number,
    files: DriveFile[], folders: FolderNode[],
  ): Promise<void> => {
    for (const entry of await children(folderId)) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (isFolder(entry.mimeType)) {
        // Depth is relative to the CATEGORY, so a product is 1 and a product
        // nested inside a product is 2. That is what misnest detection reads.
        if (depth >= 1) folders.push({ path: path.split('/').slice(1).join('/'), name: entry.name, depth });
        await walk(entry.id, path, depth + 1, files, folders);
      } else {
        files.push({
          id: entry.id,
          path,
          md5: entry.md5Checksum ?? null,
          size: Number(entry.size ?? 0),
          modifiedTime: entry.modifiedTime ?? new Date().toISOString(),
        });
      }
    }
  };

  let cache: { files: DriveFile[]; folders: FolderNode[] } | null = null;
  const load = async (rootId: string) => {
    if (cache) return cache;
    const files: DriveFile[] = [];
    const folders: FolderNode[] = [];
    await walk(rootId, '', 0, files, folders);
    cache = { files, folders };
    return cache;
  };

  return {
    listAll: async (rootId) => (await load(rootId)).files,
    listFolders: async (rootId) => (await load(rootId)).folders,
    download: async (fileId) => {
      const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' },
      );
      return Buffer.from(res.data as ArrayBuffer);
    },
  };
};
