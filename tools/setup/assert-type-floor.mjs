/**
 * The 16px type floor, enforced.
 *
 * CLAUDE.md: "Type floor 16px everywhere including the dashboard. 17px body on
 * desktop. 14px small print floor, used rarely."
 *
 * HOW THE FLOOR IS ACTUALLY HELD, which is the thing to understand before
 * changing this file: the project does not police `text-xs` at call sites. It
 * REDEFINES Tailwind's scale in `tokens.css` so the small classes cannot be
 * small. `--text-xs` is 14px here rather than Tailwind's 12px, `--text-sm` is
 * 16px rather than 14px, and `--text-base` is 17px rather than 16px.
 *
 * That is a much better mechanism than a lint rule over class names, because
 * it holds for code nobody has linted yet. It has one weakness: it is five
 * lines of CSS that look like an ordinary scale, and anyone "tidying" them
 * back towards Tailwind's defaults would lower the floor across three surfaces
 * at once, invisibly, with no test failing.
 *
 * So this guards the tokens themselves, and the two ways to go under them:
 *
 *   1. A token redefined below its floor. The real invariant.
 *   2. An arbitrary size, `text-[13px]`, which bypasses the scale entirely.
 *   3. A raw `font-size` in CSS that is not a var(), same bypass.
 *
 * The rule is the backstop, not the standard.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['apps', 'packages'];
const SKIP = new Set(['node_modules', '.next', 'dist', 'prototype']);

/** Token, and the smallest it may be, in px. */
const TOKEN_FLOOR = {
  '--text-xs': 14, // small print floor, used rarely
  '--text-sm': 16, // the absolute floor
  '--text-base': 16, // 17px in practice, but 16 is the rule
};

/** The floor for anything written as a literal rather than through the scale. */
const LITERAL_FLOOR = 14;

const toPx = (value, unit) => (unit === 'rem' || unit === 'em' ? Number(value) * 16 : Number(value));

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx|ts|css)$/.test(path)) files.push(path);
  }
};
for (const root of ROOTS) walk(root);

const breaches = [];
const seenTokens = new Set();

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`;

    // 1. The tokens themselves.
    for (const [token, floor] of Object.entries(TOKEN_FLOOR)) {
      const match = line.match(new RegExp(`${token}\\s*:\\s*(\\d+(?:\\.\\d+)?)(px|rem|em)`));
      if (!match) continue;
      seenTokens.add(token);
      const px = toPx(match[1], match[2]);
      if (px < floor) {
        breaches.push(`${where}  ${token} is ${px}px, below its ${floor}px floor`);
      }
    }

    // 2. Arbitrary Tailwind sizes, which go around the scale.
    for (const match of line.matchAll(/\btext-\[(\d+(?:\.\d+)?)(px|rem|em)\]/g)) {
      const px = toPx(match[1], match[2]);
      if (px < LITERAL_FLOOR) {
        breaches.push(`${where}  ${match[0]} is ${px}px, below the ${LITERAL_FLOOR}px floor`);
      }
    }

    // 3. A raw font-size that is not reading a token.
    const raw = line.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/);
    if (raw) {
      const px = toPx(raw[1], raw[2]);
      if (px < LITERAL_FLOOR) {
        breaches.push(`${where}  font-size ${px}px is below the ${LITERAL_FLOOR}px floor`);
      }
    }
  });
}

// A token that has gone MISSING is as bad as one set too small: without a
// redefinition, Tailwind's own 12px text-xs comes back and the floor is gone
// everywhere at once, which is exactly the silent failure this file exists for.
const missing = Object.keys(TOKEN_FLOOR).filter((t) => !seenTokens.has(t));
if (missing.length > 0) {
  breaches.push(
    `${missing.join(', ')} no longer redefined. Tailwind's default scale returns, ` +
      'and text-xs goes back to 12px across every surface.',
  );
}

if (breaches.length > 0) {
  console.error(`\nType floor breached in ${breaches.length} place(s):\n`);
  for (const b of breaches) console.error(`  ${b}`);
  console.error('\nCLAUDE.md: type floor 16px everywhere, 14px small print floor, used');
  console.error('rarely. The dashboard is not exempt. The scale is redefined in');
  console.error('packages/ui/src/tokens/tokens.css, which is what actually holds the floor.\n');
  process.exit(1);
}

console.log(`Type floor holds. ${Object.keys(TOKEN_FLOOR).length} tokens checked across ${files.length} files.`);
