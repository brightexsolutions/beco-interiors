import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'beco.brightex.dev@gmail.com',
  fullName: 'Brightex Ops',
  role: 'brightex_admin' as const,
  isActive: true,
  mustChangePassword: false,
}));
vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

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

const { createStaffUser, deleteStaffUser, setStaffRole, setStaffActive, resetStaffPassword, saveStaffPublicProfile, uploadStaffPhoto } =
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

describe('a Beco holder of the staff grant (D135)', () => {
  const HOLDER = {
    userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    email: 'irene@beco.co.ke',
    fullName: 'Irene',
    role: 'beco_admin',
    isActive: true,
    mustChangePassword: false,
    canWriteBlog: false,
    canReadAudit: false,
    canManageUsers: true,
    moduleGrants: [],
  } as never;
  const TARGET = '33333333-3333-4333-8333-333333333333';
  const asHolder = () => requirePath.mockResolvedValueOnce(HOLDER);
  const targetForm = (extra: Record<string, string> = {}) => {
    const form = new FormData();
    form.set('userId', TARGET);
    form.set('updatedAt', '2026-10-07T10:00:00.000Z');
    for (const [key, value] of Object.entries(extra)) form.set(key, value);
    return form;
  };

  it('cannot create a Brightex admin, and the login is never made', async () => {
    asHolder();
    const form = new FormData();
    form.set('email', 'sneak@brightex.test');
    form.set('fullName', 'Sneak');
    form.set('role', 'brightex_admin');
    const result = await createStaffUser({}, form);
    expect(result.error).toBe('Only Brightex manages a Brightex account.');
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates a Beco account', async () => {
    asHolder();
    createUser.mockResolvedValue({ data: { user: { id: TARGET } }, error: null });
    maybeSingle.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set('email', 'new.sales@beco.co.ke');
    form.set('fullName', 'New Sales');
    form.set('role', 'beco_sales');
    const result = await createStaffUser({}, form);
    expect(result.password).toBeTruthy();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ role: 'beco_sales', created_by: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }));
  });

  it('cannot reissue a Brightex password, checked before the service role call', async () => {
    asHolder();
    maybeSingle.mockResolvedValueOnce({ data: { role: 'brightex_admin' }, error: null });
    const result = await resetStaffPassword({}, targetForm());
    expect(result.error).toBe('Only Brightex manages a Brightex account.');
    expect(updateUserById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('reissues a Beco password', async () => {
    asHolder();
    maybeSingle
      .mockResolvedValueOnce({ data: { role: 'beco_sales' }, error: null })
      .mockResolvedValueOnce({ data: { id: TARGET }, error: null });
    updateUserById.mockResolvedValue({ error: null });
    rpc.mockResolvedValue({ error: null });
    const result = await resetStaffPassword({}, targetForm());
    expect(result.password).toBeTruthy();
    expect(updateUserById).toHaveBeenCalledWith(TARGET, expect.objectContaining({ password: result.password }));
  });

  it('cannot promote anyone into Brightex', async () => {
    asHolder();
    const result = await setStaffRole({}, targetForm({ role: 'brightex_admin' }));
    expect(result.error).toBe('Only Brightex manages a Brightex account.');
    expect(update).not.toHaveBeenCalled();
  });

  it('cannot deactivate a Brightex admin or end their sessions', async () => {
    asHolder();
    maybeSingle.mockResolvedValueOnce({ data: { role: 'brightex_admin' }, error: null });
    const result = await setStaffActive({}, targetForm({ isActive: 'false' }));
    expect(result.error).toBe('Only Brightex manages a Brightex account.');
    expect(update).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('cannot edit a Brightex admin on the website listing either', async () => {
    asHolder();
    maybeSingle.mockResolvedValueOnce({ data: { role: 'brightex_admin' }, error: null });
    const result = await saveStaffPublicProfile({}, targetForm({ publicTitle: 'x' }));
    expect(result.error).toBe('Only Brightex manages a Brightex account.');
    expect(update).not.toHaveBeenCalled();
  });

  it('stops on an account that is no longer there', async () => {
    asHolder();
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const result = await setStaffActive({}, targetForm({ isActive: 'false' }));
    expect(result.error).toBe('That account is gone. Reload the list.');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('a Beco admin on Users by module grant alone (D136)', () => {
  const VIEWER = {
    userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    email: 'irene@beco.co.ke',
    fullName: 'Irene',
    role: 'beco_admin',
    isActive: true,
    mustChangePassword: false,
    canWriteBlog: false,
    canReadAudit: false,
    canManageUsers: false,
    moduleGrants: ['users'],
  } as never;
  const TARGET = '33333333-3333-4333-8333-333333333333';
  const asViewer = () => requirePath.mockResolvedValueOnce(VIEWER);
  const targetForm = (extra: Record<string, string> = {}) => {
    const form = new FormData();
    form.set('userId', TARGET);
    form.set('updatedAt', '2026-10-07T10:00:00.000Z');
    for (const [key, value] of Object.entries(extra)) form.set(key, value);
    return form;
  };

  it('cannot create an account, and the login is never made', async () => {
    asViewer();
    const form = new FormData();
    form.set('email', 'njeri.kamau@beco.co.ke');
    form.set('fullName', 'Njeri Kamau');
    form.set('role', 'beco_sales');
    const result = await createStaffUser({}, form);
    expect(result.error).toMatch(/read this section/i);
    expect(createUser).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('cannot reissue a password: the service role is never asked', async () => {
    asViewer();
    const result = await resetStaffPassword({}, targetForm());
    expect(result.error).toMatch(/read this section/i);
    expect(result.password).toBeUndefined();
    expect(updateUserById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('cannot change a role or deactivate, before the database is asked', async () => {
    asViewer();
    expect((await setStaffRole({}, targetForm({ role: 'beco_sales' }))).error).toMatch(/read this section/i);
    asViewer();
    expect((await setStaffActive({}, targetForm({ isActive: 'false' }))).error).toMatch(/read this section/i);
    expect(update).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('cannot edit the website listing either', async () => {
    asViewer();
    const result = await saveStaffPublicProfile({}, targetForm({ isPublic: 'true', publicTitle: 'Showroom' }));
    expect(result.error).toMatch(/read this section/i);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('deleteStaffUser (D158)', () => {
  const TARGET = '33333333-3333-4333-8333-333333333333';
  const form = () => {
    const f = new FormData();
    f.set('userId', TARGET);
    f.set('updatedAt', '2026-10-21T10:00:00.000Z');
    return f;
  };

  it('deletes through the database function, then retires the login softly', async () => {
    rpc.mockResolvedValue({ error: null });
    deleteUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await deleteStaffUser({}, form());
    expect(result.error).toBeUndefined();
    expect(result.ok).toMatch(/Account deleted/);
    expect(rpc).toHaveBeenCalledWith('delete_user', { p_user_id: TARGET, p_updated_at: '2026-10-21T10:00:00.000Z' });
    expect(deleteUser).toHaveBeenCalledWith(TARGET, true);
  });

  it('says so when the row went but the login could not be retired', async () => {
    rpc.mockResolvedValue({ error: null });
    deleteUser.mockResolvedValue({ data: { user: null }, error: { message: 'auth down' } });
    const result = await deleteStaffUser({}, form());
    expect(result.ok).toMatch(/could not be retired/);
  });

  it('stops at the database refusal and never touches the login', async () => {
    rpc.mockResolvedValue({ error: { code: 'P0001', message: 'That account is gone' } });
    const result = await deleteStaffUser({}, form());
    expect(result.error).toBe('That account is gone. Reload the list.');
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('refuses the signed-in account before asking the database', async () => {
    const f = form();
    f.set('userId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const result = await deleteStaffUser({}, f);
    expect(result.error).toBe('You cannot delete your own account.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a Beco holder of the staff grant, before anything is touched', async () => {
    requirePath.mockResolvedValueOnce({
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'irene@beco.co.ke',
      fullName: 'Irene',
      role: 'beco_admin',
      isActive: true,
      mustChangePassword: false,
      canWriteBlog: false,
      canReadAudit: false,
      canManageUsers: true,
      moduleGrants: [],
    } as never);
    const result = await deleteStaffUser({}, form());
    expect(result.error).toBe('Only Brightex deletes accounts.');
    expect(rpc).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
