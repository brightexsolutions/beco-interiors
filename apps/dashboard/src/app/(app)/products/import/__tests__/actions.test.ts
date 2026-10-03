import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async (..._a: unknown[]) => ({ userId: 'u-1', email: 'irene.kariuki@beco.co.ke', role: 'beco_admin' }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...a) }));

const dispatchImport = vi.fn(async (..._a: unknown[]) => ({ ok: true as const }));
vi.mock('@/lib/github-actions', () => ({ dispatchImport: (...a: unknown[]) => dispatchImport(...a) }));

const reportOpsFailure = vi.fn(async (..._a: unknown[]) => {});
vi.mock('@/lib/ops-alert', () => ({ reportOpsFailure: (...a: unknown[]) => reportOpsFailure(...a) }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { startImport } = await import('../actions');

const form = (mode: string, target: string) => {
  const f = new FormData();
  f.set('mode', mode);
  f.set('target', target);
  return f;
};

describe('startImport', () => {
  beforeEach(() => {
    dispatchImport.mockClear();
    reportOpsFailure.mockClear();
    requirePath.mockClear();
    // A fresh user per test keeps the per user rate limit out of the way.
    requirePath.mockResolvedValue({ userId: `u-${Math.random()}`, email: 'irene.kariuki@beco.co.ke', role: 'beco_admin' });
  });

  it('re-checks the caller against /products before anything else', async () => {
    await startImport({}, form('dry-run', 'staging'));
    expect(requirePath).toHaveBeenCalledWith('/products');
  });

  it('refuses a mode or target the workflow does not declare, without dispatching', async () => {
    const result = await startImport({}, form('delete-everything', 'staging'));
    expect(result.error).toMatch(/Pick what the import should do/);
    expect(dispatchImport).not.toHaveBeenCalled();
  });

  it('dispatches the parsed inputs and says what started', async () => {
    const result = await startImport({}, form('import', 'production'));
    expect(dispatchImport).toHaveBeenCalledWith({ mode: 'import', target: 'production' });
    expect(result.ok).toMatch(/Import started on production/);
  });

  it('holds a second start within a minute from the same person', async () => {
    requirePath.mockResolvedValue({ userId: 'same-person', email: 'x@beco.co.ke', role: 'beco_admin' });
    await startImport({}, form('dry-run', 'staging'));
    const second = await startImport({}, form('dry-run', 'staging'));
    expect(second.error).toMatch(/less than a minute ago/);
    expect(dispatchImport).toHaveBeenCalledTimes(1);
  });

  it('reports a failed dispatch to Brightex and tells the user', async () => {
    dispatchImport.mockResolvedValueOnce({ ok: false, error: 'GitHub refused the import (HTTP 403).' } as never);
    const result = await startImport({}, form('dry-run', 'staging'));
    expect(result.error).toBe('GitHub refused the import (HTTP 403).');
    expect(reportOpsFailure).toHaveBeenCalledWith(expect.objectContaining({ area: 'catalogue.import' }));
  });
});
