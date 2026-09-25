#!/usr/bin/env node
/**
 * Links the single root .env.local into each app.
 *
 * Next.js reads .env.local relative to the APP, not the workspace root, so
 * without this `pnpm dev` fails with "supabaseUrl is required" on a fresh
 * clone. The symlinks cannot be committed, because .gitignore correctly
 * refuses to track anything matching .env.* and relaxing that risks someone
 * replacing a symlink with a real file full of secrets.
 *
 * So it is generated on install instead. One file to maintain, no secrets
 * tracked, and nothing for a new developer to remember.
 */
import { existsSync, lstatSync, symlinkSync, unlinkSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const source = join(root, '.env.local');
const apps = ['storefront', 'dashboard'];

if (!existsSync(source)) {
  console.log('  no .env.local at the root yet, skipping. See docs/SETUP.md phase 0');
  process.exit(0);
}

for (const app of apps) {
  const target = join(root, 'apps', app, '.env.local');
  if (existsSync(target) || lstatSync(target, { throwIfNoEntry: false })) {
    // Never clobber a real file someone put there deliberately.
    if (!lstatSync(target).isSymbolicLink()) {
      console.log(`  apps/${app}/.env.local is a real file, leaving it alone`);
      continue;
    }
    unlinkSync(target);
  }
  symlinkSync(relative(dirname(target), source), target);
  console.log(`  linked apps/${app}/.env.local`);
}
