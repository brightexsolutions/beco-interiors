import { afterAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';

config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

const RUN = `zz-int-settings-${Date.now().toString(36)}`;

const service = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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

afterAll(async () => {
  const sb = service();
  await sb.from('settings').update({ value: 0.16 }).eq('key', 'vat_rate');
  const { data } = await sb.from('users').select('id').eq('email', 'sam.odhiambo@beco.co.ke').maybeSingle();
  if (data) await sb.from('users').update({ can_write_blog: false, can_read_audit: false }).eq('id', data.id);
  await sb.from('blog_posts').delete().eq('slug', `${RUN}-post`);
});

describe('settings and grants against local Postgres', () => {
  it('lets Irene write VAT and keeps Studio writes on Brightex only', async () => {
    const irene = await signInAs('irene.kariuki@beco.co.ke');
    const vat = await irene.client.from('settings').update({ value: 0.16 }).eq('key', 'vat_rate').select('key').maybeSingle();
    expect(vat.error).toBeNull();

    const sam = await signInAs('sam.odhiambo@beco.co.ke');
    const denied = await sam.client.from('blog_posts').insert({
      title: 'Nope',
      slug: `${RUN}-post`,
      body: 'Sintered stone is fused mineral powder, not a resin composite.',
      author: 'Sam Odhiambo',
    });
    expect(denied.error).toBeTruthy();

    const brightex = await signInAs('beco.brightex.dev@gmail.com');
    const grant = await brightex.client
      .from('users')
      .update({ can_write_blog: true })
      .eq('email', 'sam.odhiambo@beco.co.ke')
      .select('id')
      .maybeSingle();
    expect(grant.error).toBeNull();

    const stillDenied = await sam.client.from('blog_posts').insert({
      title: 'Granted post',
      slug: `${RUN}-post`,
      body: 'Sintered stone is fused mineral powder, not a resin composite. Beco stocks it.',
      author: 'Sam Odhiambo',
    });
    expect(stillDenied.error).toBeTruthy();
  });
});
