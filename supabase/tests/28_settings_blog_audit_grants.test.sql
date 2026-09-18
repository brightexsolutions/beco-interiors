-- Settings writes, blog grants, and audit-read grants.
begin;
select plan(18);

\set admin_id    '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_id    '''aaaaaaaa-0000-0000-0000-000000000002'''
\set pm_id       '''aaaaaaaa-0000-0000-0000-000000000004'''
\set editor_id   '''aaaaaaaa-0000-0000-0000-000000000005'''
\set brightex_id '''aaaaaaaa-0000-0000-0000-000000000007'''
\set post_id     '''dddddddd-0000-0000-0000-000000000001'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,    'admin@beco.co.ke'),
  (:sales_id::uuid,    'sales.a@beco.co.ke'),
  (:pm_id::uuid,       'pm@beco.co.ke'),
  (:editor_id::uuid,   'editor@beco.co.ke'),
  (:brightex_id::uuid, 'info.brightexsolutions@gmail.com')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,    'admin@beco.co.ke',                    'A Admin',   'beco_admin', true),
  (:sales_id::uuid,    'sales.a@beco.co.ke',                  'Sales A',   'beco_sales', true),
  (:pm_id::uuid,       'pm@beco.co.ke',                       'P Manager', 'beco_product_manager', true),
  (:editor_id::uuid,   'editor@beco.co.ke',                   'E Editor',  'beco_editor', true),
  (:brightex_id::uuid, 'info.brightexsolutions@gmail.com',    'B Admin',   'brightex_admin', true);

update settings
   set value = '["info.brightexsolutions@gmail.com"]'::jsonb
 where key = 'brightex_allowed_emails';

set local role authenticated;

-- ---------- sales cannot write settings or the grants ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select is_empty(
  $$update settings set value = '0.18'::jsonb where key = 'vat_rate' returning key$$,
  'sales cannot write vat_rate'
);

select throws_ok(
  $$update users set can_write_blog = true
     where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  'P0001',
  'Only Brightex can assign those permissions',
  'sales cannot grant themselves blog write'
);

select is_empty(
  $$select id from audit_log limit 1$$,
  'sales cannot read the audit log'
);

select throws_ok(
  $$insert into blog_posts (title, slug, body, author)
    values ('Nope', 'zz-sales-post', 'Body.', 'Sales A')$$,
  '42501',
  null,
  'sales cannot write a blog post'
);

-- ---------- ungranted editor cannot write blog ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","role":"authenticated"}';

select throws_ok(
  $$insert into blog_posts (title, slug, body, author)
    values ('Nope', 'zz-editor-post', 'Body.', 'E Editor')$$,
  '42501',
  null,
  'an ungranted editor cannot write a blog post'
);

-- ---------- beco_admin can write settings, not blog, not audit ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select isnt_empty(
  $$update settings set value = '0.16'::jsonb where key = 'vat_rate' returning key$$,
  'beco_admin can write vat_rate'
);

select throws_ok(
  $$insert into blog_posts (title, slug, body, author)
    values ('Nope', 'zz-admin-post', 'Body.', 'A Admin')$$,
  '42501',
  null,
  'beco_admin cannot write a blog post'
);

select is_empty(
  $$select id from audit_log limit 1$$,
  'beco_admin cannot read the audit log unless granted'
);

select is_empty(
  $$update users set can_read_audit = true
     where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning id$$,
  'beco_admin cannot assign audit read'
);

-- ---------- Brightex can write blog, read audit, and grant ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000007","role":"authenticated"}';

select lives_ok(
  $$insert into blog_posts (id, title, slug, body, author)
    values (
      'dddddddd-0000-0000-0000-000000000001',
      'Granted later',
      'zz-brightex-post',
      'Body.',
      'B Admin'
    )$$,
  'brightex_admin can write a blog post'
);

select isnt_empty(
  $$select id from audit_log where entity_type = 'blog_posts'$$,
  'brightex_admin can read the audit log'
);

select lives_ok(
  $$update users set can_write_blog = true, can_read_audit = true
     where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  'brightex_admin can assign blog and audit to a salesperson'
);

-- ---------- granted sales still cannot write blog; audit grant still works ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$update blog_posts set title = 'Sales edit'
     where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a salesperson cannot edit a blog post even with can_write_blog'
);

select isnt_empty(
  $$select id from audit_log where entity_type = 'blog_posts'$$,
  'a granted salesperson can read the audit log'
);

-- ---------- product manager still cannot grant ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select throws_ok(
  $$update users set can_write_blog = true
     where id = 'aaaaaaaa-0000-0000-0000-000000000004'$$,
  'P0001',
  'Only Brightex can assign those permissions',
  'product manager cannot assign blog write'
);

-- ---------- anon still cannot read bank or the allowlist ----------
set local role anon;
set local request.jwt.claims = '{}';

select is_empty(
  $$select * from settings where key = 'bank_details'$$,
  'anon cannot read bank details'
);

select is_empty(
  $$select * from settings where key = 'paybill_number'$$,
  'anon cannot read paybill number'
);

select is_empty(
  $$select * from settings where key = 'notification_recipients'$$,
  'anon cannot read notification recipients'
);

select * from finish();
rollback;
