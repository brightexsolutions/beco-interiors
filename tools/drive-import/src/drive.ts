import type { DriveFile } from './classify';

/**
 * The Drive layer, behind an interface.
 *
 * Everything else in the pipeline depends on THIS, not on googleapis, so the
 * whole import is testable against fixtures with no service account and no
 * network. That is also why M2 could be built before the account existed.
 */
export interface DriveSource {
  /** Every file under the root, recursively, with paths relative to it. */
  listAll(rootFolderId: string): Promise<DriveFile[]>;
  /** Folder paths and their depth, for misnest detection. */
  listFolders(rootFolderId: string): Promise<Array<{ path: string; name: string; depth: number }>>;
  /** Only called for new and changed files. */
  download(fileId: string): Promise<Buffer>;
}

/**
 * A FULL LISTING WALK is the primary mechanism, not the changes feed.
 *
 * The plan originally specified `changes.list` with a stored page token. That
 * was wrong: **the Drive changes feed is scoped to a drive, not a folder.**
 * BECO PRODUCTS lives in someone else's My Drive and is shared with a service
 * account, and a service account's own changes feed reflects its own empty
 * drive. It may return nothing useful at all.
 *
 * Listing 24 folders and roughly 120 files is a handful of API calls and takes
 * seconds. Change detection was always the md5 comparison against
 * `import_files` anyway, which does not need the changes feed to work.
 *
 * See docs/REVIEW.md 1.2.
 */
export const createGoogleDriveSource = (): DriveSource => {
  throw new Error(
    'Google Drive source not yet wired. Needs GOOGLE_SERVICE_ACCOUNT_KEY_PATH and the ' +
      'BECO PRODUCTS folder shared with the service account. See docs/SETUP.md 2.1.',
  );
};
