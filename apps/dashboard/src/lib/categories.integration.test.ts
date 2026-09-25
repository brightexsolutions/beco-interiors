import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';
import { fetchCategoryBySlug, fetchCategoryGroupOptions, fetchCategoryTree } from './categories';

config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

// This file exists because the mocked unit tests for lib/categories.ts and
// the category actions all stub the Supabase client, so none of them could
// have caught a query PostgREST itself refuses. fetchCategoryTree's first
// version embedded categories.parent_id straight into its own select
// string to read a row's parent name, which typechecks and looks correct,
// but PostgREST cannot disambiguate a self join that way: confirmed by
// hand against the live REST API, both the constraint-name and the
// column-name hint resolve to the CHILD rows, never the one the FK column
// itself points at. That only breaks the moment a real client asks
// PostgREST for it, exactly what this file does and the mocks cannot.

const PREFIX = 'zz-int-taxo';
const PASSWORD = 'zz-integration-test-pass';
const RUN = `${PREFIX}-${Date.now().toString(36)}`;

const service = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const signInAs = async (email: string) => {
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) throw new Error(`sign in failed for ${email}: ${error?.message}`);
  return client;
};

let pmId: string;
let groupId: string;
let childId: string;
let productId: string;
const authUserIds: string[] = [];

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  const sb = service();

  await sb.from('products').delete().ilike('slug', `${PREFIX}-%`);
  await sb.from('categories').delete().ilike('slug', `${PREFIX}-%`);
  const { data: existingUsers } = await sb.from('users').select('id').ilike('email', `${PREFIX}-%`);
  for (const u of existingUsers ?? []) await sb.auth.admin.deleteUser(u.id);

  const pmAuth = await sb.auth.admin.createUser({
    email: `${RUN}-pm@beco.co.ke`,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(pmAuth.error).toBeNull();
  pmId = pmAuth.data.user!.id;
  authUserIds.push(pmId);
  expect(
    (
      await sb
        .from('users')
        .insert({ id: pmId, email: `${RUN}-pm@beco.co.ke`, full_name: 'ZZ Taxo PM', role: 'beco_product_manager', must_change_password: false })
    ).error,
  ).toBeNull();

  const group = await sb
    .from('categories')
    .insert({ name: 'ZZ Taxo Group', slug: `${PREFIX}-group`, is_published: true, sort_order: 900 })
    .select('id')
    .single();
  expect(group.error).toBeNull();
  groupId = group.data!.id;

  const child = await sb
    .from('categories')
    .insert({ name: 'ZZ Taxo Child', slug: `${PREFIX}-child`, parent_id: groupId, is_published: true, sort_order: 910 })
    .select('id')
    .single();
  expect(child.error).toBeNull();
  childId = child.data!.id;

  const product = await sb
    .from('products')
    .insert({
      name: 'ZZ Taxo Product',
      slug: `${PREFIX}-product`,
      category_id: childId,
      price_display_mode: 'poa',
      is_published: true,
      unit: 'per piece',
    })
    .select('id')
    .single();
  expect(product.error).toBeNull();
  productId = product.data!.id;
});

afterAll(async () => {
  const sb = service();
  await sb.from('products').delete().eq('id', productId);
  await sb.from('categories').delete().eq('id', childId);
  await sb.from('categories').delete().eq('id', groupId);
  for (const id of authUserIds) await sb.auth.admin.deleteUser(id);
});

describe('fetchCategoryTree against local Postgres', () => {
  it('nests the child under its group with the real parent name, not the reverse', async () => {
    const client = await signInAs(`${RUN}-pm@beco.co.ke`);
    const tree = await fetchCategoryTree(client);
    const group = tree.find((g) => g.slug === `${PREFIX}-group`);
    expect(group).toBeTruthy();
    expect(group!.parentName).toBeNull();
    expect(group!.childCount).toBe(1);

    const child = group!.children.find((c) => c.slug === `${PREFIX}-child`);
    expect(child).toBeTruthy();
    expect(child!.parentName).toBe('ZZ Taxo Group');
    expect(child!.productCount).toBe(1);
  });
});

describe('fetchCategoryBySlug against local Postgres', () => {
  it('resolves the same parent name as the tree does, and the right product count', async () => {
    const client = await signInAs(`${RUN}-pm@beco.co.ke`);
    const row = await fetchCategoryBySlug(client, `${PREFIX}-child`);
    expect(row?.parentName).toBe('ZZ Taxo Group');
    expect(row?.productCount).toBe(1);
    expect(row?.childCount).toBe(0);
  });

  it('returns a null parent name for a top level group', async () => {
    const client = await signInAs(`${RUN}-pm@beco.co.ke`);
    const row = await fetchCategoryBySlug(client, `${PREFIX}-group`);
    expect(row?.parentName).toBeNull();
    expect(row?.childCount).toBe(1);
  });
});

describe('fetchCategoryGroupOptions against local Postgres', () => {
  it('lists the group but excludes it when told to, and never lists a child', async () => {
    const client = await signInAs(`${RUN}-pm@beco.co.ke`);
    const all = await fetchCategoryGroupOptions(client);
    expect(all.some((o) => o.id === groupId)).toBe(true);
    expect(all.some((o) => o.id === childId)).toBe(false);

    const excluding = await fetchCategoryGroupOptions(client, groupId);
    expect(excluding.some((o) => o.id === groupId)).toBe(false);
  });
});
