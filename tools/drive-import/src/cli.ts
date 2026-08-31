#!/usr/bin/env tsx
import { buildPlan } from './plan';
import { renderReport } from './report';
import { createFixtureSource } from './fixture-source';
import { createGoogleDriveSource } from './google-drive';
import { executePlan } from './run';
import { createClient } from '@supabase/supabase-js';

/**
 * pnpm drive:import --dry-run    classify everything, change nothing
 * pnpm drive:import --fixture    run against fixtures, no network
 * pnpm drive:import              incremental import
 */
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const useFixture = args.has('--fixture') || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

const main = async () => {
  const source = useFixture ? createFixtureSource() : createGoogleDriveSource();
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID ?? 'fixture';
  if (useFixture) console.log('\nFIXTURE source. Nothing touches Drive.');

  console.log('\nListing Drive...');
  const [listing, folders] = await Promise.all([
    source.listAll(rootId),
    source.listFolders(rootId),
  ]);
  console.log(`  ${listing.length} files, ${folders.length} folders`);

  // Everything seen before, so a second run downloads nothing.
  let known: Array<{ driveFileId: string; path: string; md5: string | null;
                     role: null; productId: null }> = [];
  if (!useFixture && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.SUPABASE_SERVICE_ROLE_KEY!,
                            { auth: { persistSession: false } });
    const { data } = await sb.from('import_files').select('drive_file_id,path,md5_checksum');
    known = (data ?? []).map((r) => ({
      driveFileId: r.drive_file_id as string,
      path: r.path as string,
      md5: (r.md5_checksum as string | null) ?? null,
      role: null, productId: null,
    }));
    console.log(`  ${known.length} previously imported`);
  }

  const plan = buildPlan(listing, folders, known, { force });
  console.log(renderReport(plan));

  if (dryRun) {
    console.log('Dry run. Nothing downloaded, nothing written.\n');
    return;
  }

  if (force) console.log('FORCE: re-downloading and re-encoding everything.\n');
  console.log('Importing...\n');
  const started = Date.now();
  const result = await executePlan(plan, source, { onProgress: (m) => console.log(m) });
  const mins = ((Date.now() - started) / 60000).toFixed(1);

  console.log('\nDONE');
  console.log(`  ${result.productsTouched} products`);
  console.log(`  ${result.downloaded} downloaded, ${result.cacheHits} from cache, ${(result.bytesIn / 1e6).toFixed(0)}MB in`);
  console.log(`  ${result.uploaded} derivatives, ${(result.bytesOut / 1e6).toFixed(1)}MB out`);
  console.log(`  ${(1 - result.bytesOut / Math.max(result.bytesIn, 1)) * 100 | 0}% smaller`);
  console.log(`  ${mins} minutes`);
  if (result.warnings.length) {
    console.log(`\n  ${result.warnings.length} size budget warning(s):`);
    for (const w of result.warnings.slice(0, 10)) console.log(`    ${w}`);
  }
  console.log('');
};

main().catch((err: unknown) => {
  console.error('\nFAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
