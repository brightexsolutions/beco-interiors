import { describe, expect, it, vi } from 'vitest';
import { fetchAssignees } from '../quote-detail';

describe('fetchAssignees', () => {
  it('asks for Beco sales and Beco admin, never a Brightex admin', async () => {
    const inRoles = vi.fn(() => ({
      order: vi.fn(async () => ({
        data: [
          { id: 'sales-1', full_name: 'Ken Mutiso' },
          { id: 'admin-1', full_name: 'Irene Kariuki' },
        ],
      })),
    }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ in: inRoles })),
        })),
      })),
    };

    const people = await fetchAssignees(supabase as never);
    expect(inRoles).toHaveBeenCalledWith('role', ['beco_sales', 'beco_admin']);
    expect(inRoles.mock.calls[0]?.[1]).not.toContain('brightex_admin');
    expect(people.map((person) => person.fullName)).toEqual(['Ken Mutiso', 'Irene Kariuki']);
  });
});
