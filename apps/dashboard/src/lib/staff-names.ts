import type { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Display names for staff ids the caller's own `users` read does not reach.
 * A salesperson can read only their own users row, so a colleague's name
 * on a quote or order comes back empty from the join; this fills it from
 * `staff_names()`, which returns the name and nothing else (migration 55).
 * A failure returns an empty map: a missing name is shown as a colleague,
 * never as "Unassigned".
 */
export async function fetchStaffNames(
  supabase: SupabaseClient,
  ids: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.rpc('staff_names', { p_ids: unique });
  if (error || !data) return new Map();
  return new Map((data as Array<{ id: string; full_name: string }>).map((row) => [row.id, row.full_name]));
}

/** The shown name for an owner id: the joined name, the looked up one, or a
 *  neutral "A colleague" when the id is set but no name could be read. */
export const staffName = (
  id: string | null,
  joined: string | null,
  names: Map<string, string>,
): string | null => {
  if (!id) return null;
  return joined ?? names.get(id) ?? 'A colleague';
};
