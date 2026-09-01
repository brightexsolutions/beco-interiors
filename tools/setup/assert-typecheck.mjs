/**
 * Every workspace package that declares a `typecheck` script must have a
 * tsconfig.json for it to read.
 *
 * Without one, `tsc --noEmit` prints its help text and exits non zero, so the
 * package looks like it is failing rather than like it is not configured, and
 * the difference is easy to miss in a wall of Turbo output. Seven packages
 * were in that state and none of them had ever been typechecked.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['apps', 'packages', 'tools'];
const missing = [];

for (const root of roots) {
  if (!existsSync(root)) continue;
  for (const name of readdirSync(root)) {
    const dir = join(root, name);
    const pkgPath = join(dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.scripts?.typecheck) continue;
    if (!existsSync(join(dir, 'tsconfig.json'))) missing.push(dir);
  }
}

if (missing.length > 0) {
  console.error('These packages declare a typecheck script but have no tsconfig.json,');
  console.error('so tsc prints its help text instead of checking anything:\n');
  for (const dir of missing) console.error(`  ${dir}`);
  process.exit(1);
}
console.log('typecheck config: every package with a typecheck script has a tsconfig.');
