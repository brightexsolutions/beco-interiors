-- Users, settings, and the Studio gate. RLS and its tests ship WITH the table.

create table settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table users (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text unique not null,
  full_name             text not null,
  role                  user_role not null,
  is_active             boolean not null default true,
  must_change_password  boolean not null default true,
  last_login_at         timestamptz,
  created_by            uuid references users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Role helpers. Defined here rather than in migration 1 because they read
-- `users`, and a `language sql` function is parsed at CREATE time.
create or replace function current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid() and is_active;
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select current_user_role() in ('beco_admin','brightex_admin');
$$;

-- D42: Studio requires TWO independent conditions, both checked here rather
-- than in middleware alone. An EXPLICIT ADDRESS LIST, not a domain suffix,
-- because Brightex's real addresses are gmail.com and a suffix check would
-- match every Gmail account in existence.
create or replace function is_brightex_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from users u
    where u.id = auth.uid()
      and u.is_active
      and u.role = 'brightex_admin'
      and u.email = any (
        select jsonb_array_elements_text(value)
        from settings where key = 'brightex_allowed_emails'
      )
  );
$$;

insert into settings (key, value) values
  ('brightex_allowed_emails', '[]'::jsonb),
  ('vat_rate', '0.16'::jsonb),
  ('quote_validity_days', '30'::jsonb);

alter table users    enable row level security;
alter table settings enable row level security;

-- Deny by default. Every policy below is additive.
create policy users_read_self on users for select
  using (id = auth.uid());
create policy users_read_all_admin on users for select
  using (is_admin());
create policy users_write_brightex on users for all
  using (is_brightex_user()) with check (is_brightex_user());

-- Nobody changes their own role. Enforced by POLICY, not by hiding a control.
create policy users_update_self_safe on users for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from users where id = auth.uid()));

-- Public keys only. Bank details and the allowlist are never anon readable.
create policy settings_read_public on settings for select
  using (key in ('vat_rate','quote_validity_days','whatsapp_number','business_phone'));
create policy settings_read_staff on settings for select
  using (current_user_role() is not null);
create policy settings_write_admin on settings for all
  using (is_admin()) with check (is_admin());
