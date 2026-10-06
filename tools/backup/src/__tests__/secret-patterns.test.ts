import { describe, expect, it } from 'vitest';
import { findSecrets } from '../secret-patterns';

// Shapes only. None of these is a real credential: the bodies are repeated
// letters, which is exactly what a scanner must still catch.
const fake = (prefix: string, length: number, alphabet = 'A') => `${prefix}${alphabet.repeat(length)}`;

describe('findSecrets', () => {
  it('names the GitHub token the import dispatch uses, in both token shapes', () => {
    expect(findSecrets(`GITHUB_ACTIONS_TOKEN=${fake('github_pat_', 60)}`)).toContain('GitHub fine-grained token');
    expect(findSecrets(`token: ${fake('ghp_', 36, 'a')}`)).toContain('GitHub classic token');
  });

  it('names a Supabase secret key in either format', () => {
    expect(findSecrets(`${fake('eyJ', 30, 'a')}.${fake('', 30, 'b')}`)).toContain('Supabase service role JWT');
    expect(findSecrets(fake('sb_secret_', 24, 'x'))).toContain('Supabase secret API key');
  });

  it('names a secret smuggled into a public variable, token included', () => {
    expect(findSecrets('NEXT_PUBLIC_GITHUB_TOKEN=abc')).toContain('NEXT_PUBLIC_ holding a secret');
    expect(findSecrets('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=abc')).toContain('NEXT_PUBLIC_ holding a secret');
  });

  it('leaves the public keys and ordinary text alone', () => {
    expect(findSecrets('NEXT_PUBLIC_SUPABASE_ANON_KEY=')).toEqual([]);
    expect(findSecrets('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=abc123')).toEqual([]);
    expect(findSecrets('const re = /^re_[a-z]+$/; // a regex about Resend, not a key')).toEqual([]);
    expect(findSecrets('sb_publishable_abcdefghijklmnopqrstuvwxyz')).toEqual([]);
  });
});
