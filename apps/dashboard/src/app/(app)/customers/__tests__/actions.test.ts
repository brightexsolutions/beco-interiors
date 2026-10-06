import { afterEach, describe, expect, it, vi } from 'vitest';

type Role = 'beco_sales' | 'beco_product_manager' | 'beco_admin' | 'brightex_admin';
let role: Role = 'beco_sales';
const requirePath = vi.fn(async () => ({ userId: 'sales-1', role }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...(a as [])) }));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({}) }));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const insertCustomer = vi.fn();
const updateCustomerRecord = vi.fn();
const softDeleteCustomer = vi.fn();
vi.mock('@/lib/customer-records', () => ({
  insertCustomer: (...a: unknown[]) => insertCustomer(...a),
  updateCustomerRecord: (...a: unknown[]) => updateCustomerRecord(...a),
  softDeleteCustomer: (...a: unknown[]) => softDeleteCustomer(...a),
}));

const { createCustomer, updateCustomer, deleteCustomer } = await import('../actions');

const ID = '6f1c1b2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';

const formOf = (over: Record<string, string> = {}) => {
  const form = new FormData();
  const values = { name: 'ZZ Wanjiku', phone: '0722 123 456', kraPin: 'a123456789z', clientType: 'designer', ...over };
  for (const [k, v] of Object.entries(values)) form.set(k, v);
  return form;
};

afterEach(() => {
  vi.clearAllMocks();
  role = 'beco_sales';
});

describe('createCustomer', () => {
  it('gates on the Customers route and writes as the signed-in user, validated', async () => {
    insertCustomer.mockResolvedValue({ ok: true, id: ID, updatedAt: 't1' });
    const result = await createCustomer({}, formOf());
    expect(requirePath).toHaveBeenCalledWith('/customers');
    expect(insertCustomer).toHaveBeenCalledWith(
      {},
      'sales-1',
      expect.objectContaining({ name: 'ZZ Wanjiku', phone: '0722 123 456', kraPin: 'A123456789Z', clientType: 'designer', email: null }),
    );
    expect(result).toEqual({
      ok: 'ZZ Wanjiku added.',
      customerId: ID,
      customer: { id: ID, name: 'ZZ Wanjiku', phone: '0722 123 456', email: null, company: null, kraPin: 'A123456789Z' },
      updatedAt: 't1',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/customers');
  });

  it('refuses a bad KRA PIN or phone before the database, naming the field', async () => {
    expect(await createCustomer({}, formOf({ kraPin: 'A1234Z' }))).toMatchObject({ field: 'kraPin' });
    expect(await createCustomer({}, formOf({ phone: '12' }))).toMatchObject({ field: 'phone' });
    expect(insertCustomer).not.toHaveBeenCalled();
  });

  it('turns a number already on file into a pointer to that customer, not a duplicate', async () => {
    const existing = { id: ID, name: 'ZZ Achieng', phone: '0722123456', email: null, company: null, kraPin: null };
    insertCustomer.mockResolvedValue({ ok: false, reason: 'duplicate', existing });
    const result = await createCustomer({}, formOf());
    expect(result).toEqual({ error: 'That number already belongs to ZZ Achieng.', field: 'phone', existing });
  });

  it('refuses the product manager before the database is asked', async () => {
    role = 'beco_product_manager';
    expect((await createCustomer({}, formOf())).error).toMatch(/permission/);
    expect(insertCustomer).not.toHaveBeenCalled();
  });
});

describe('updateCustomer', () => {
  it('saves under the lock and returns the new token', async () => {
    updateCustomerRecord.mockResolvedValue({ ok: true, id: ID, updatedAt: 't2' });
    const result = await updateCustomer({}, formOf({ customerId: ID, updatedAt: 't1', notes: 'Prefers WhatsApp' }));
    expect(updateCustomerRecord).toHaveBeenCalledWith({}, ID, 't1', expect.objectContaining({ notes: 'Prefers WhatsApp' }));
    expect(result).toEqual({ ok: 'Saved.', customerId: ID, updatedAt: 't2' });
    expect(revalidatePath).toHaveBeenCalledWith(`/customers/${ID}`);
  });

  it('says plainly when someone else saved first', async () => {
    updateCustomerRecord.mockResolvedValue({ ok: false, reason: 'stale' });
    const result = await updateCustomer({}, formOf({ customerId: ID, updatedAt: 't1' }));
    expect(result.error).toMatch(/changed while you were editing/);
  });

  it('does not let the product manager edit', async () => {
    role = 'beco_product_manager';
    expect((await updateCustomer({}, formOf({ customerId: ID, updatedAt: 't1' }))).error).toMatch(/permission/);
    expect(updateCustomerRecord).not.toHaveBeenCalled();
  });
});

describe('deleteCustomer', () => {
  it('is refused for a salesperson before the database is asked', async () => {
    const form = new FormData();
    form.set('customerId', ID);
    expect((await deleteCustomer({}, form)).error).toBe('Only an admin can delete a customer.');
    expect(softDeleteCustomer).not.toHaveBeenCalled();
  });

  it('soft deletes for an admin', async () => {
    role = 'beco_admin';
    softDeleteCustomer.mockResolvedValue({ ok: true });
    const form = new FormData();
    form.set('customerId', ID);
    expect(await deleteCustomer({}, form)).toEqual({ ok: 'Customer deleted.', customerId: ID });
    expect(softDeleteCustomer).toHaveBeenCalledWith({}, ID);
  });

  it('passes the database refusal through', async () => {
    role = 'brightex_admin';
    softDeleteCustomer.mockResolvedValue({ ok: false, message: 'That customer is no longer here.' });
    const form = new FormData();
    form.set('customerId', ID);
    expect((await deleteCustomer({}, form)).error).toBe('That customer is no longer here.');
  });
});
