/**
 * Fails the build if a secret reaches tracked files. The backstop, not the standard.
 * Run: pnpm check:secrets
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { findSecrets } from './secret-patterns';

const SKIP = /^(tools\/backup\/src\/secret-(scan|patterns)\.ts|tools\/backup\/src\/__tests__\/|docs\/|files\/|prototype\/)/;

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
let failures = 0;

for (const file of files) {
  if (SKIP.test(file)) continue;
  let content: string;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const name of findSecrets(content)) {
    console.error(`LEAK  ${file}: ${name}`);
    failures++;
  }
}

if (failures) {
  console.error(`\n${failures} potential secret(s) in tracked files.`);
  process.exit(1);
}
console.log(`Scanned ${files.length} tracked files. No secrets found.`);
