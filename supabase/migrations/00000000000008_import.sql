-- Import pipeline state. The zip was a one time bootstrap and is retired;
-- from here the pipeline reads the Drive API and diffs against these tables.

create table import_runs (
  id          uuid primary key default gen_random_uuid(),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  mode        text not null,
  summary     jsonb not null default '{}'::jsonb
);

create table import_issues (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references import_runs(id) on delete cascade,
  path       text not null,
  reason     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- One row per Drive file ever seen. This is what makes change detection work
-- without re downloading anything: Drive gives an md5 for binary files, so
-- "has this photograph actually changed" is answerable without fetching it.
create table import_files (
  drive_file_id       text primary key,
  path                text not null,
  md5_checksum        text,
  size_bytes          bigint,
  drive_modified_time timestamptz,
  product_id          uuid references products(id) on delete set null,
  role                image_role,
  status              import_outcome not null default 'new',
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  imported_at         timestamptz
);

create index import_files_status_idx on import_files (status);

-- Single row holding the changes feed page token and the last full walk.
create table import_state (
  id                     boolean primary key default true check (id),
  drive_page_token       text,
  last_full_reconcile_at timestamptz,
  constraint import_state_singleton check (id)
);

insert into import_state (id) values (true);

alter table import_runs   enable row level security;
alter table import_issues enable row level security;
alter table import_files  enable row level security;
alter table import_state  enable row level security;

-- Readable by whoever manages the catalog, so "which updates are in place"
-- is a page someone opens rather than a memory of a WhatsApp thread.
create policy import_runs_read on import_runs for select
  using (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'));
create policy import_issues_read on import_issues for select
  using (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'));
create policy import_files_read on import_files for select
  using (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'));
create policy import_state_read on import_state for select
  using (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'));

-- Writes happen only through the pipeline, which uses the service role.
create policy import_runs_write   on import_runs   for all using (is_brightex_user()) with check (is_brightex_user());
create policy import_issues_write on import_issues for all using (is_brightex_user()) with check (is_brightex_user());
create policy import_files_write  on import_files  for all using (is_brightex_user()) with check (is_brightex_user());
create policy import_state_write  on import_state  for all using (is_brightex_user()) with check (is_brightex_user());
