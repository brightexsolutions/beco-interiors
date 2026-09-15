import { describe, expect, it } from 'vitest';
import { launchSettingsSchema, signInSchema } from '../launch';

describe('signInSchema', () => {
  it('accepts an email and a non empty password', () => {
    expect(signInSchema.safeParse({ email: 'admin@beco.co.ke', password: 'x' }).success).toBe(true);
  });

  it('rejects a missing password, so a blank submit does not reach Supabase', () => {
    expect(signInSchema.safeParse({ email: 'admin@beco.co.ke', password: '' }).success).toBe(false);
  });

  it('rejects something that is not an email', () => {
    expect(signInSchema.safeParse({ email: 'admin', password: 'x' }).success).toBe(false);
  });
});

describe('launchSettingsSchema', () => {
  it('turns a blank field into null, which clears the countdown', () => {
    const parsed = launchSettingsSchema.parse({ launchAt: '  ' });
    expect(parsed.launchAt).toBeNull();
  });

  it('normalises a valid date to an ISO string', () => {
    const parsed = launchSettingsSchema.parse({ launchAt: '2026-10-15T09:00' });
    expect(parsed.launchAt).toBe(new Date('2026-10-15T09:00').toISOString());
  });

  it('rejects a value that is not a date', () => {
    expect(launchSettingsSchema.safeParse({ launchAt: 'sometime in October' }).success).toBe(false);
  });
});
