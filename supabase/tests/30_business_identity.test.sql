-- Business identity settings: staff read, admin write, anonymous nothing.
begin;
select plan(9);

\set admin_id    '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_id    '''aaaaaaaa-0000-0000-0000-000000000002'''
\set pm_id       '''aaaaaaaa-0000-0000-0000-000000000004'''
\set brightex_id '''aaaaaaaa-0000-0000-0000-000000000007'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,    'admin@beco.co.ke'),
  (:sales_id::uuid,    'sales.a@beco.co.ke'),
  (:pm_id::uuid,       'pm@beco.co.ke'),
  (:brightex_id::uuid, 'info.brightexsolutions@gmail.com')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,    'admin@beco.co.ke',                 'A Admin',   'beco_admin', true),
  (:sales_id::uuid,    'sales.a@beco.co.ke',               'Sales A',   'beco_sales', true),
  (:pm_id::uuid,       'pm@beco.co.ke',                    'P Manager', 'beco_product_manager', true),
  (:brightex_id::uuid, 'info.brightexsolutions@gmail.com', 'B Admin',   'brightex_admin', true);

select is(
  (select count(*)::int from settings
    where key in ('business_legal_name','kra_pin','vat_number','business_address','business_email')),
  5,
  'all five business identity keys are seeded'
);

set local role authenticated;

-- ---------- sales reads, cannot write ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select isnt_empty(
  $$select key from settings where key = 'kra_pin'$$,
  'sales can read the KRA PIN, which its quotes print'
);

select is_empty(
  $$update settings set value = '"P000000000X"'::jsonb where key = 'kra_pin' returning key$$,
  'sales cannot change the KRA PIN'
);

-- ---------- product manager cannot write ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select is_empty(
  $$update settings set value = '"Someone Else Ltd"'::jsonb where key = 'business_legal_name' returning key$$,
  'product manager cannot change the legal name'
);

-- ---------- beco_admin writes ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select isnt_empty(
  $$update settings set value = '"P051234567X"'::jsonb where key = 'kra_pin' returning key$$,
  'beco_admin can set the KRA PIN'
);

-- ---------- brightex writes ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000007","role":"authenticated"}';

select isnt_empty(
  $$update settings set value = '"accounts@beco.co.ke"'::jsonb where key = 'business_email' returning key$$,
  'brightex_admin can set the business email'
);

-- ---------- anonymous reads none of it ----------
set local role anon;
set local request.jwt.claims = '{}';

select is_empty(
  $$select * from settings where key = 'kra_pin'$$,
  'anon cannot read the KRA PIN'
);

select is_empty(
  $$select * from settings where key in ('business_legal_name','vat_number','business_address','business_email')$$,
  'anon cannot read the rest of the business identity'
);

select is_empty(
  $$update settings set value = '"x"'::jsonb where key = 'kra_pin' returning key$$,
  'anon cannot write the KRA PIN'
);

select * from finish();
rollback;
