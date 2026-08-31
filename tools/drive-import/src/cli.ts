#!/usr/bin/env tsx
import { buildPlan } from './plan';
import { renderReport } from './report';
import { createFixtureSource } from './fixture-source';
import { createGoogleDriveSource } from './drive';

/**
 * pnpm drive:import --dry-run           classify everything, change nothing
 * pnpm drive:import --dry-run --fixture run against the real export defects,
 *                                       with no service account and no network
 * pnpm drive:import                     incremental import
 */
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const useFixture = args.has('--fixture') || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

const main = async () => {
  if (useFixture) {
    console.log('\nUsing the FIXTURE source: the real 29 August export, defects included.');
    console.log('No service account configured, so nothing touches Drive. See docs/SETUP.md 2.1.');
  }

  const source = useFixture ? createFixtureSource() : createGoogleDriveSource();
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID ?? 'fixture';

  const [listing, folders] = await Promise.all([
    source.listAll(rootId),
    source.listFolders(rootId),
  ]);

  // TODO M2: read import_files from the database. Empty means every file
  // classifies as new, which is correct for a first run.
  const known: never[] = [];

  const plan = buildPlan(listing, folders, known);
  console.log(renderReport(plan));

  if (dryRun) {
    console.log('Dry run. Nothing downloaded, nothing written.\n');
    return;
  }
  console.log('Download, derivatives and upload land next. Use --dry-run for now.\n');
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
