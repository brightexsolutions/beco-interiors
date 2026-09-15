/**
 * Fails the build if a secret reaches tracked files. The backstop, not the standard.
 * Run: pnpm check:secrets
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'Supabase service role JWT', re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: 'NEXT_PUBLIC_ holding a secret', re: /NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET|PRIVATE)/ },
  { name: 'Private key block', re: /BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/ },
  { name: 'Google service account key', re: /"type"\s*:\s*"service_account"/ },
  { name: 'Resend key', re: /\bre_[A-Za-z0-9]{20,}/ },
  { name: 'Gemini or Google API key', re: /\bAIza[A-Za-z0-9_-]{30,}/ },
];

const SKIP = /^(tools\/backup\/src\/secret-scan\.ts|docs\/|files\/|prototype\/)/;

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
  for (const { name, re } of PATTERNS) {
    if (re.test(content)) {
      console.error(`LEAK  ${file}: ${name}`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`\n${failures} potential secret(s) in tracked files.`);
  process.exit(1);
}
console.log(`Scanned ${files.length} tracked files. No secrets found.`);
