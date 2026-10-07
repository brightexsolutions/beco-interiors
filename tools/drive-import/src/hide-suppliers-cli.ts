#!/usr/bin/env tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { applyHidePlan, describePlan, planHideSuppliers, planIsEmpty, readSnapshot } from './hide-suppliers';

/**
 * pnpm catalogue:hide-suppliers --dry-run    print every change, write nothing
 * pnpm catalogue:hide-suppliers              make them
 *
 * One-off, D104 amended 7 October 2026: takes supplier names off the
 * catalogue the importer made before supplier folders were read through.
 * See `hide-suppliers.ts` for what it changes and why.
 *
 * Reads the same environment as the importer: NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY, from the shell first and the root .env.local
 * second, so a production run sets both in the shell and the local file is
 * never read for them. The target is printed before anything else.
 */
config({ path: new URL('../../../.env.local', import.meta.url).pathname, quiet: true });

const dryRun = process.argv.includes('--dry-run');

const main = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both required');

  console.log(`\nTarget: ${new URL(url).host}${dryRun ? '  (dry run, nothing is written)' : ''}\n`);
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const plan = planHideSuppliers(await readSnapshot(sb));
  const lines = describePlan(plan);
  for (const line of lines) console.log(`  ${line}`);

  if (planIsEmpty(plan)) {
    console.log('\nNothing to change.\n');
    return;
  }
  if (dryRun) {
    console.log('\nDry run. Nothing written.\n');
    return;
  }

  await applyHidePlan(sb, plan);
  const after = planHideSuppliers(await readSnapshot(sb));
  console.log(planIsEmpty(after)
    ? '\nDone. A second run finds nothing to change.\n'
    : '\nWritten, but a second look still finds changes. Run it again and read the output.\n');
};

main().catch((err: unknown) => {
  console.error('\nFAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
