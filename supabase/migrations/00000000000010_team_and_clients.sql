-- Public facing team, and corporate clients.
--
-- From Beco, 31 August: sales agents must be visible so a buyer can verify
-- they are dealing with a genuine Beco salesperson, which is fraud prevention
-- rather than vanity. Directors must NOT appear.

-- Opt in, and defaulting to false. A user is invisible publicly unless
-- someone deliberately makes them visible, so a new director cannot appear
-- on the website by accident.
alter table users add column is_public boolean not null default false;
alter table users add column public_title text;
alter table users add column public_phone text;
alter table users add column public_photo jsonb;
alter table users add column sort_order int not null default 0;

-- Only a salesperson can ever be public. Enforced here rather than trusted to
-- whoever ticks the box, because the requirement is specifically that
-- directors are not shown.
alter table users add constraint users_only_sales_are_public check (
  not is_public or role = 'beco_sales'
);

create table clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  logo          jsonb,
  project       text,
  sector        text,
  -- Some corporates prohibit being named publicly, so consent is recorded on
  -- the row rather than assumed. Nothing publishes without it.
  has_permission boolean not null default false,
  is_published  boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- Belt and braces: a row cannot be published without recorded permission.
alter table clients add constraint clients_published_needs_permission check (
  not is_published or has_permission
);

alter table clients enable row level security;

-- Anonymous sees only agents who have opted in, and only the public columns
-- by convention. Never an email, never a role.
create policy users_read_public_team on users for select
  using (is_public and is_active);

create policy clients_read_published on clients for select
  using (is_published and has_permission);
create policy clients_read_staff on clients for select
  using (current_user_role() is not null);
create policy clients_write_admin on clients for all
  using (is_admin()) with check (is_admin());

create trigger clients_audit after insert or update or delete on clients
  for each row execute function audit_trigger();
