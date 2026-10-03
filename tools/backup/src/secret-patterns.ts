/**
 * What a leaked secret looks like, for `secret-scan.ts` and its test. A
 * pattern earns its place by naming a credential this project actually
 * holds, so a hit is a leak and not a guess: the Supabase keys, the Resend
 * key, the Gemini key, the GitHub token the dashboard dispatches the import
 * with, and the private key blocks behind the Drive service account.
 */
export interface SecretPattern {
  name: string;
  re: RegExp;
}

export const SECRET_PATTERNS: readonly SecretPattern[] = [
  { name: 'Supabase service role JWT', re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: 'Supabase secret API key', re: /\bsb_secret_[A-Za-z0-9_-]{20,}/ },
  { name: 'NEXT_PUBLIC_ holding a secret', re: /NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET|PRIVATE|TOKEN)/ },
  { name: 'Private key block', re: /BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/ },
  { name: 'Google service account key', re: /"type"\s*:\s*"service_account"/ },
  { name: 'Resend key', re: /\bre_[A-Za-z0-9]{20,}/ },
  { name: 'Gemini or Google API key', re: /\bAIza[A-Za-z0-9_-]{30,}/ },
  { name: 'GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{40,}/ },
  { name: 'GitHub classic token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}/ },
];

/** The names of every pattern the content trips. Empty means clean. */
export const findSecrets = (content: string): string[] =>
  SECRET_PATTERNS.filter(({ re }) => re.test(content)).map(({ name }) => name);
