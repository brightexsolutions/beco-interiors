import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'beco.brightex.dev@gmail.com',
  fullName: 'Brightex Ops',
  role: 'brightex_admin' as const,
  isActive: true,
  mustChangePassword: false,
}));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...a) }));

const maybeSingle = vi.fn();
const insert = vi.fn();
const update = vi.fn();
const rpc = vi.fn();
const from = vi.fn(() => ({
  insert: (payload: unknown) => {
    insert(payload);
    return { select: () => ({ maybeSingle }) };
  },
  select: () => ({
    eq: () => ({ maybeSingle }),
  }),
  update: (payload: unknown) => {
    update(payload);
    return {
      eq: () => ({
        eq: () => ({
          select: () => ({ maybeSingle }),
        }),
      }),
    };
  },
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from, rpc }) }));

const createUser = vi.fn();
const deleteUser = vi.fn();
const updateUserById = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({
  getServiceSupabase: () => ({
    auth: { admin: { createUser, deleteUser, updateUserById } },
  }),
}));

vi.mock('@/lib/storefront-revalidate', () => ({
  revalidateStorefrontPaths: vi.fn(async () => undefined),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/product-photo', () => ({
  processProductPhoto: vi.fn(async () => {
    throw new Error('processProductPhoto should be mocked per test');
  }),
}));
vi.mock('@/lib/product-storage', () => ({
  isProductStorageConfigured: vi.fn(() => false),
  uploadProductDerivatives: vi.fn(),
  deleteProductDerivatives: vi.fn(),
}));

const { createStaffUser, setStaffRole, setStaffActive, resetStaffPassword, saveStaffPublicProfile, uploadStaffPhoto } =
  await import('../actions');

afterEach(() => {
  requirePath.mockClear();
  maybeSingle.mockReset();
  insert.mockReset();
  update.mockReset();
  rpc.mockReset();
  createUser.mockReset();
  deleteUser.mockReset();
  updateUserById.mockReset();
});

describe('createStaffUser', () => {
  it('re-checks the session and issues a password that is not stored', async () => {
    createUser.mockResolvedValue({
      data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set('email', 'njeri.kamau@beco.co.ke');
    form.set('fullName', 'Njeri Kamau');
    form.set('role', 'beco_sales');
    const result = await createStaffUser({}, form);
    expect(requirePath).toHaveBeenCalledWith('/users');
    expect(result.password).toBeTruthy();
    expect(String(result.password).length).toBeGreaterThanOrEqual(10);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'njeri.kamau@beco.co.ke',
        must_change_password: true,
        is_active: true,
        created_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
    );
    expect(JSON.stringify(insert.mock.calls[0]?.[0])).not.toContain(result.password);
  });

  it('deletes the auth user when the profile insert fails, so a duplicate email cannot leave an orphan', async () => {
    createUser.mockResolvedValue({
      data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    const form = new FormData();
    form.set('email', 'irene.kariuki@beco.co.ke');
    form.set('fullName', 'Irene');
    form.set('role', 'beco_admin');
    const result = await createStaffUser({}, form);
    expect(result.error).toMatch(/already has an account/i);
    expect(deleteUser).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });
});

describe('setStaffRole', () => {
  it('refuses changing the signed-in account', async () => {
    const form = new FormData();
    form.set('userId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    form.set('updatedAt', '2026-09-18T10:00:00.000Z');
    form.set('role', 'beco_admin');
    const result = await setStaffRole({}, form);
    expect(result.error).toMatch(/your own role/i);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('setStaffActive', () => {
  it('revokes sessions when deactivating', async () => {
    maybeSingle.mockResolvedValue({ data: { id: '22222222-2222-4222-8222-222222222222' }, error: null });
    rpc.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set('userId', '22222222-2222-4222-8222-222222222222');
    form.set('updatedAt', '2026-09-18T10:00:00.000Z');
    const result = await setStaffActive({}, form);
    expect(result.ok).toMatch(/deactivated/i);
    expect(rpc).toHaveBeenCalledWith('end_user_sessions', {
      p_user_id: '22222222-2222-4222-8222-222222222222',
    });
  });
});

describe('resetStaffPassword', () => {
  it('re-arms the forced change and returns a new secret', async () => {
    updateUserById.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({ data: { id: '22222222-2222-4222-8222-222222222222' }, error: null });
    rpc.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set('userId', '22222222-2222-4222-8222-222222222222');
    form.set('updatedAt', '2026-09-18T10:00:00.000Z');
    const result = await resetStaffPassword({}, form);
    expect(result.password).toBeTruthy();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ must_change_password: true }));
  });
});

describe('saveStaffPublicProfile', () => {
  it('refuses listing a director on /team before the write', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: '33333333-3333-4333-8333-333333333333', role: 'beco_admin', updated_at: '2026-09-18T10:00:00.000Z' },
      error: null,
    });
    const form = new FormData();
    form.set('userId', '33333333-3333-4333-8333-333333333333');
    form.set('updatedAt', '2026-09-18T10:00:00.000Z');
    form.set('isPublic', 'on');
    form.set('publicTitle', 'Director');
    const result = await saveStaffPublicProfile({}, form);
    expect(result.error).toMatch(/only sales/i);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('uploadStaffPhoto', () => {
  it('asks for a file rather than writing an empty photograph', async () => {
    const form = new FormData();
    form.set('userId', '22222222-2222-4222-8222-222222222222');
    form.set('updatedAt', '2026-09-18T10:00:00.000Z');
    form.set('alt', 'Sam Odhiambo at Beco Interiors');
    const result = await uploadStaffPhoto({}, form);
    expect(result.error).toMatch(/choose a photograph/i);
    expect(update).not.toHaveBeenCalled();
  });
});
