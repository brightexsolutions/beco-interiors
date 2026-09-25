import { afterAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';

config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

const TITLE = `ZZ int announcement ${Date.now().toString(36)}`;

const service = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const anon = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

const signInAs = async (email: string) => {
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: 'beco-dev-pass' });
  if (error || !data.user) throw new Error(`sign in failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
};

const createdIds: string[] = [];

afterAll(async () => {
  const sb = service();
  if (createdIds.length) await sb.from('announcements').delete().in('id', createdIds);
});

describe('announcement scheduling', () => {
  it('hides a row that starts tomorrow from anon, and shows it once the window includes now', async () => {
    const { client, userId } = await signInAs('irene.kariuki@beco.co.ke');
    const starts = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const ends = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const inserted = await client
      .from('announcements')
      .insert({
        title: TITLE,
        type: 'sale',
        starts_at: starts,
        ends_at: ends,
        is_active: true,
        created_by: userId,
      })
      .select('id')
      .single();
    expect(inserted.error).toBeNull();
    const id = inserted.data!.id;
    createdIds.push(id);

    const hidden = await anon().from('announcements').select('id').eq('id', id);
    expect(hidden.data ?? []).toEqual([]);

    const moved = await client
      .from('announcements')
      .update({ starts_at: new Date(Date.now() - 60 * 1000).toISOString() })
      .eq('id', id)
      .select('id')
      .single();
    expect(moved.error).toBeNull();

    const visible = await anon().from('announcements').select('title').eq('id', id).single();
    expect(visible.data?.title).toBe(TITLE);
  });

  it('refuses the product manager writing announcements', async () => {
    const { client } = await signInAs('aisha.farah@beco.co.ke');
    const result = await client.from('announcements').insert({
      title: `${TITLE} pm`,
      type: 'notice',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    expect(result.error).toBeTruthy();
  });
});
