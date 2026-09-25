-- The category admin closes a real gap: `categories_write` (migration 4) had
-- never been attacked per role, only read access was proven (06). This file
-- does the write side, plus `category_slugs` (migration 49), the same
-- rename-history table `product_slugs` already has.

begin;
select plan(12);

\set admin_id  '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_id  '''aaaaaaaa-0000-0000-0000-000000000002'''
\set pm_id     '''aaaaaaaa-0000-0000-0000-000000000004'''
\set editor_id '''aaaaaaaa-0000-0000-0000-000000000005'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,  'zz-cat-admin@beco.co.ke'),
  (:sales_id::uuid,  'zz-cat-sales@beco.co.ke'),
  (:pm_id::uuid,     'zz-cat-pm@beco.co.ke'),
  (:editor_id::uuid, 'zz-cat-editor@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,  'zz-cat-admin@beco.co.ke',  'ZZ Cat Admin',  'beco_admin', true),
  (:sales_id::uuid,  'zz-cat-sales@beco.co.ke',  'ZZ Cat Sales',  'beco_sales', true),
  (:pm_id::uuid,     'zz-cat-pm@beco.co.ke',     'ZZ Cat PM',     'beco_product_manager', true),
  (:editor_id::uuid, 'zz-cat-editor@beco.co.ke', 'ZZ Cat Editor', 'beco_editor', true);

-- ---------- categories: per role writes, the gap this file closes ----------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select lives_ok(
  $$insert into categories (name, slug, is_published, sort_order)
    values ('ZZ Cat Group', 'zz-cat-group', true, 950)$$,
  'beco_product_manager CAN create a category'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$update categories set description = 'Updated by an admin.' where slug = 'zz-cat-group'$$,
  'beco_admin CAN update a category'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

-- An INSERT has no existing row for USING to filter, so a denied one raises
-- 42501 on WITH CHECK rather than silently matching zero rows, unlike the
-- UPDATE cases below.
select throws_ok(
  $$insert into categories (name, slug, is_published) values ('ZZ Cat Sales', 'zz-cat-sales-try', true)$$,
  '42501',
  null,
  'beco_sales CANNOT create a category'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","role":"authenticated"}';

select throws_ok(
  $$insert into categories (name, slug, is_published) values ('ZZ Cat Editor', 'zz-cat-editor-try', true)$$,
  '42501',
  null,
  'beco_editor CANNOT create a category'
);

set local role anon;
reset request.jwt.claims;

select is_empty(
  $$update categories set name = 'Hijacked' where slug = 'zz-cat-group' returning id$$,
  'anon CANNOT write a category'
);

-- ---------- category_slugs: rename history, mirrors product_slugs ----------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select lives_ok(
  $$update categories set slug = 'zz-cat-group-renamed' where slug = 'zz-cat-group'$$,
  'a product manager can rename a category'
);

select isnt_empty(
  $$select 1 from category_slugs cs join categories c on c.id = cs.category_id
     where cs.slug = 'zz-cat-group' and c.slug = 'zz-cat-group-renamed'$$,
  'the trigger recorded the former slug against the renamed category'
);

select lives_ok(
  $$update categories set slug = 'zz-cat-group-again' where slug = 'zz-cat-group-renamed'$$,
  'a second rename is allowed'
);

select is(
  (select count(*)::int from category_slugs
     where slug in ('zz-cat-group', 'zz-cat-group-renamed')),
  2,
  'both former slugs survive a second rename, so an old link two hops back still resolves'
);

select lives_ok(
  $$insert into category_slugs (slug, category_id)
    select 'zz-cat-slug-direct', id from categories where slug = 'zz-cat-group-again'$$,
  'a product manager can also write category_slugs directly, not only through the trigger'
);

set local role anon;
reset request.jwt.claims;

select isnt_empty(
  $$select 1 from category_slugs where slug = 'zz-cat-group'$$,
  'anon CAN read category_slugs, which the storefront redirect depends on'
);

select throws_ok(
  $$insert into category_slugs (slug, category_id)
    select 'zz-cat-slug-anon', id from categories where slug = 'zz-cat-group-again'$$,
  '42501',
  null,
  'anon CANNOT write category_slugs'
);

select * from finish();
rollback;
