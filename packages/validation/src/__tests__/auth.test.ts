import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from '../auth';

describe('changePasswordSchema', () => {
  it('accepts a long enough password when both fields match', () => {
    const r = changePasswordSchema.safeParse({ password: 'correct horse staple', confirm: 'correct horse staple' });
    expect(r.success).toBe(true);
  });

  it('rejects a password under 10 characters, so a weak choice never reaches Supabase', () => {
    const r = changePasswordSchema.safeParse({ password: 'short', confirm: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects a mismatch and points the error at the confirm field', () => {
    const r = changePasswordSchema.safeParse({ password: 'a-real-password', confirm: 'a-real-passwerd' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['confirm']);
  });

  it('rejects a password over the 72 byte bcrypt limit', () => {
    const long = 'x'.repeat(73);
    expect(changePasswordSchema.safeParse({ password: long, confirm: long }).success).toBe(false);
  });
});
