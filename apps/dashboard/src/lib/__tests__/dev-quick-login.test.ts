import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDevQuickLoginEnabled, isForcedPasswordChangeEnforced } from '../dev-quick-login';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isDevQuickLoginEnabled', () => {
  it('is off under test, which is how CI stays closed', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(isDevQuickLoginEnabled()).toBe(false);
  });
});

describe('isForcedPasswordChangeEnforced', () => {
  it('is enforced under test, so no other test inherits the dev shortcut', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(isForcedPasswordChangeEnforced()).toBe(true);
  });

  it('is enforced in production, which is the case that actually matters', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isForcedPasswordChangeEnforced()).toBe(true);
  });

  it('is skipped under next dev', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isForcedPasswordChangeEnforced()).toBe(false);
  });

  it('can be switched back on in development, so the real flow stays reachable', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_FORCE_PASSWORD_CHANGE', '1');
    expect(isForcedPasswordChangeEnforced()).toBe(true);
  });

  it('ignores any value other than 1, so a stray empty string does not half-enable it', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_FORCE_PASSWORD_CHANGE', '');
    expect(isForcedPasswordChangeEnforced()).toBe(false);
  });
});
