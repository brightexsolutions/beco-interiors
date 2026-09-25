import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';

config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

const PREFIX = 'zz-int-users';
const STAFF_PASS = 'beco-dev-pass';
const RUN = `${PREFIX}-${Date.now().toString(36)}`;

const service = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const signInAs = async (email: string) => {
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: STAFF_PASS });
  if (error || !data.user) throw new Error(`sign in failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
};

const createdAuthIds: string[] = [];

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  const sb = service();
  const { data: existingUsers } = await sb.from('users').select('id').ilike('email', `${PREFIX}-%`);
  for (const u of existingUsers ?? []) await sb.auth.admin.deleteUser(u.id);
});

afterAll(async () => {
  const sb = service();
  const { data: existingUsers } = await sb.from('users').select('id').ilike('email', `${PREFIX}-%`);
  for (const u of existingUsers ?? []) await sb.auth.admin.deleteUser(u.id);
  for (const id of createdAuthIds) await sb.auth.admin.deleteUser(id);
});

describe('users staff writes', () => {
  it('lets the seeded Brightex admin create a flagged sales account', async () => {
    const { client, userId } = await signInAs('beco.brightex.dev@gmail.com');
    const created = await service().auth.admin.createUser({
      email: `${RUN}-sales@beco.co.ke`,
      password: 'zz-integration-test-pass',
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const salesId = created.data.user!.id;
    createdAuthIds.push(salesId);

    const inserted = await client.from('users').insert({
      id: salesId,
      email: `${RUN}-sales@beco.co.ke`,
      full_name: 'ZZ Users Sales',
      role: 'beco_sales',
      must_change_password: true,
      created_by: userId,
    });
    expect(inserted.error).toBeNull();

    const { data } = await client.from('users').select('must_change_password, role').eq('id', salesId).single();
    expect(data?.must_change_password).toBe(true);
    expect(data?.role).toBe('beco_sales');

    const listed = await client
      .from('users')
      .update({
        is_public: true,
        public_title: 'Showroom',
        public_phone: '0722333730',
        public_photo: {
          path: 'team/placeholder/ab12',
          alt: 'ZZ Users Sales at Beco Interiors',
          width: 400,
          height: 500,
        },
      })
      .eq('id', salesId)
      .select('is_public, public_photo')
      .maybeSingle();
    expect(listed.error).toBeNull();
    expect(listed.data?.is_public).toBe(true);
    expect(listed.data?.public_photo).toEqual(
      expect.objectContaining({ path: 'team/placeholder/ab12' }),
    );
  });

  it('refuses the product manager writing users', async () => {
    const { client } = await signInAs('aisha.farah@beco.co.ke');
    const result = await client
      .from('users')
      .update({ is_active: false })
      .eq('email', 'sam.odhiambo@beco.co.ke')
      .select('id');
    expect(result.data ?? []).toEqual([]);
  });
});
