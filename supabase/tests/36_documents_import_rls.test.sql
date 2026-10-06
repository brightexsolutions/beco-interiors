-- The six tables whose policies had no test of their own until the 3 October
-- security review (D108): documents, testimonials and the four import tables.
-- Every assertion proves what a role CANNOT do before what it can.
begin;
select plan(16);

\set admin_id      '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_id      '''aaaaaaaa-0000-0000-0000-000000000002'''
\set pm_id         '''aaaaaaaa-0000-0000-0000-000000000004'''
\set brightex_id   '''aaaaaaaa-0000-0000-0000-000000000007'''
\set impostor_id   '''aaaaaaaa-0000-0000-0000-000000000008'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,    'admin@beco.co.ke'),
  (:sales_id::uuid,    'sales@beco.co.ke'),
  (:pm_id::uuid,       'pm@beco.co.ke'),
  (:brightex_id::uuid, 'info.brightexsolutions@gmail.com'),
  (:impostor_id::uuid, 'notonthelist@gmail.com')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,    'admin@beco.co.ke',    'A Admin',   'beco_admin', true),
  (:sales_id::uuid,    'sales@beco.co.ke',    'Sales',     'beco_sales', true),
  (:pm_id::uuid,       'pm@beco.co.ke',       'P Manager', 'beco_product_manager', true),
  (:brightex_id::uuid, 'info.brightexsolutions@gmail.com', 'Brightex', 'brightex_admin', true),
  (:impostor_id::uuid, 'notonthelist@gmail.com', 'Impostor', 'brightex_admin', true);

update settings set value = '["info.brightexsolutions@gmail.com"]'::jsonb
  where key = 'brightex_allowed_emails';

insert into documents (type, reference_number, storage_path)
  values ('quote', 'BQ-TEST-0001', 'documents/BQ-TEST-0001.pdf');
insert into testimonials (client_name, quote_text, is_published) values
  ('Published Client', 'Good stone.', true),
  ('Draft Client',     'Not yet.',    false);
insert into import_runs (mode) values ('full');

-- The true totals, read before any role is set. Staging and a local stack
-- after a real import already hold rows, so a role is held to seeing all of
-- them, never to a literal 1 that only an empty database satisfies.
select count(*) as documents_total from documents \gset
select count(*) as import_runs_total from import_runs \gset
select count(*) as published_testimonials from testimonials where is_published \gset

-- ---------- anonymous ----------
set local role anon;

select is_empty($$select id from documents$$, 'anon reads no documents');
select is(
  (select count(*) from testimonials), :published_testimonials::bigint,
  'anon reads only the published testimonials'
);
select is_empty($$select id from import_runs$$, 'anon reads no import runs');
select throws_ok(
  $$insert into testimonials (client_name, quote_text) values ('Anon', 'x')$$,
  '42501', null,
  'anon cannot write a testimonial'
);

reset role;

-- ---------- beco_sales ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select is((select count(*) from documents), :documents_total::bigint, 'sales reads every issued document');
select lives_ok(
  $$insert into documents (type, reference_number, storage_path)
      values ('receipt', 'BR-TEST-0001', 'documents/BR-TEST-0001.pdf')$$,
  'sales records a document it issued'
);
select is_empty($$select id from import_runs$$, 'sales reads no import runs');
select throws_ok(
  $$insert into testimonials (client_name, quote_text) values ('Sales', 'x')$$,
  '42501', null,
  'sales cannot write a testimonial'
);

-- ---------- beco_product_manager ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select is((select count(*) from import_runs), :import_runs_total::bigint, 'the product manager reads every import run');
select is((select count(*) from import_state), 1::bigint, 'the product manager reads the import state');
select throws_ok(
  $$insert into import_issues (run_id, path, reason)
      select id, 'SOME/FOLDER', 'manual' from import_runs limit 1$$,
  '42501', null,
  'the product manager cannot write an import issue: writes belong to the pipeline'
);

-- ---------- beco_admin ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$insert into testimonials (client_name, quote_text) values ('Admin', 'x')$$,
  'the admin writes a testimonial'
);
select throws_ok(
  $$insert into import_runs (mode) values ('full')$$,
  '42501', null,
  'the admin cannot write an import run: not a Brightex user'
);

-- ---------- brightex_admin, on the allowlist ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000007","role":"authenticated"}';

select lives_ok(
  $$insert into import_runs (mode) values ('full')$$,
  'an allowlisted Brightex user writes an import run'
);
select lives_ok(
  $$update import_state set id = true$$,
  'an allowlisted Brightex user updates the import state'
);

-- ---------- brightex_admin, NOT on the allowlist (D42) ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000008","role":"authenticated"}';

select throws_ok(
  $$insert into import_runs (mode) values ('full')$$,
  '42501', null,
  'a brightex_admin off the allowlist cannot write an import run'
);

select * from finish();
rollback;
