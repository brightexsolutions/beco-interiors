import { describe, expect, it, vi } from 'vitest';
import { fetchStaffNames, staffName } from '../staff-names';

const client = (result: { data: unknown; error: unknown }) => {
  const rpc = vi.fn(async () => result);
  return { client: { rpc } as unknown as Parameters<typeof fetchStaffNames>[0], rpc };
};

describe('fetchStaffNames', () => {
  it('asks once for the distinct ids that are set', async () => {
    const c = client({ data: [{ id: 'a', full_name: 'Ken Mutiso' }], error: null });
    const names = await fetchStaffNames(c.client, ['a', null, 'a', undefined]);
    expect(c.rpc).toHaveBeenCalledWith('staff_names', { p_ids: ['a'] });
    expect(names.get('a')).toBe('Ken Mutiso');
  });

  it('does not call at all when nothing is missing', async () => {
    const c = client({ data: [], error: null });
    expect((await fetchStaffNames(c.client, [null, null])).size).toBe(0);
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it('reads a failure as no names rather than throwing', async () => {
    const c = client({ data: null, error: { message: 'denied' } });
    expect((await fetchStaffNames(c.client, ['a'])).size).toBe(0);
  });
});

describe('staffName', () => {
  const names = new Map([['a', 'Ken Mutiso']]);
  it('prefers the joined name, then the looked up one', () => {
    expect(staffName('a', 'Joined', names)).toBe('Joined');
    expect(staffName('a', null, names)).toBe('Ken Mutiso');
  });
  it('never calls a set owner Unassigned: an unreadable name is a colleague', () => {
    expect(staffName('b', null, names)).toBe('A colleague');
  });
  it('is null only when there is genuinely no owner', () => {
    expect(staffName(null, null, names)).toBeNull();
  });
});
