-- Banner pop ups, D162: the image look, its picture's shape check, and that
-- anonymous reads see the picture only on a live row, as for every column.
begin;
select plan(7);

\set admin_id  '''aaaaaaaa-0049-0000-0000-000000000001'''
\set live_id   '''cccccccc-0049-0000-0000-000000000001'''
\set off_id    '''cccccccc-0049-0000-0000-000000000002'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values (:admin_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'banner.admin@beco.co.ke', 'x', now(), now(), now());
insert into users (id, email, full_name, role, is_active)
values (:admin_id::uuid, 'banner.admin@beco.co.ke', 'Banner Admin', 'beco_admin', true);

insert into popups (id, variant, title, starts_at, ends_at, is_active, created_by, image) values
  (:live_id::uuid, 'image', 'End year sale', now() - interval '1 hour', now() + interval '1 day', true, :admin_id::uuid,
   '{"path":"popups/cccccccc-0049-0000-0000-000000000001/ab12cd34","width":3780,"height":1890,"blur":"data:x"}'),
  (:off_id::uuid,  'image', 'Old banner', now() - interval '1 hour', now() + interval '1 day', false, :admin_id::uuid,
   '{"path":"popups/cccccccc-0049-0000-0000-000000000002/ab12cd34","width":3780,"height":1890}');

select ok('image' = any(enum_range(null::popup_variant)::text[]), 'image is a pop up look');

select throws_ok(
  $$update popups set image = '{"path":"12mm/anakin/slab-0","width":10,"height":10}' where id = 'cccccccc-0049-0000-0000-000000000001'$$,
  '23514', null, 'a banner path outside popups/ is refused'
);
select throws_ok(
  $$update popups set image = '{"path":"popups/cccccccc-0049-0000-0000-000000000001/ab12cd34","width":0,"height":10}' where id = 'cccccccc-0049-0000-0000-000000000001'$$,
  '23514', null, 'a banner with no width is refused'
);
select throws_ok(
  $$update popups set image = '"popups/x"' where id = 'cccccccc-0049-0000-0000-000000000001'$$,
  '23514', null, 'a banner that is not an object is refused'
);

-- ---------- anon ----------
set local role anon;
set local request.jwt.claims = '{}';

select results_eq(
  $$select image->>'width' from popups where id::text like 'cccccccc-0049-%'$$,
  ARRAY['3780']::text[],
  'anon sees the live banner''s picture and not a switched off one'
);
select is_empty(
  $$update popups set image = null where id = 'cccccccc-0049-0000-0000-000000000001' returning id$$,
  'anon cannot clear a banner'
);

-- ---------- sales ----------
reset role;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('aaaaaaaa-0049-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'banner.sales@beco.co.ke', 'x', now(), now(), now());
insert into users (id, email, full_name, role, is_active)
values ('aaaaaaaa-0049-0000-0000-000000000002', 'banner.sales@beco.co.ke', 'Banner Sales', 'beco_sales', true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0049-0000-0000-000000000002","role":"authenticated"}';
select is_empty(
  $$update popups set image = null where id = 'cccccccc-0049-0000-0000-000000000001' returning id$$,
  'a salesperson cannot change a banner'
);

select * from finish();
rollback;
