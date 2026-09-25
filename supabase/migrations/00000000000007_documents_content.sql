-- Documents, content, announcements, analytics.

create table documents (
  id               uuid primary key default gen_random_uuid(),
  type             document_type not null,
  quote_id         uuid references quotes(id) on delete set null,
  order_id         uuid references orders(id) on delete set null,
  reference_number text not null,
  storage_path     text not null,
  generated_by     uuid references users(id),
  -- Nullable, because a counter customer may take only a printed copy. That
  -- makes "was this sent" a three state question rather than two.
  sent_to          text,
  sent_at          timestamptz,
  sent_channel     text,
  created_at       timestamptz not null default now()
);

create table blog_posts (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  slug               text not null unique,
  excerpt            text,
  body               text not null,
  cover_image        jsonb,
  -- Required before publish. A cover image with no alt fails validation.
  cover_image_alt    text,
  category           text,
  tags               jsonb not null default '[]'::jsonb,
  meta_title         text,
  meta_description   text,
  -- The post exists to own a search term. Without one it is decoration.
  target_term        text,
  reading_time       int,
  status             post_status not null default 'draft',
  published_at       timestamptz,
  -- A PERSON, never "AI". A byline is a claim of responsibility. See D40.
  author             text not null,
  generated_by_model text,
  generation_prompt  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table blog_posts add constraint blog_posts_publish_requirements check (
  status = 'draft' or (published_at is not null and cover_image_alt is not null)
);

create table testimonials (
  id           uuid primary key default gen_random_uuid(),
  client_name  text not null,
  project      text,
  quote_text   text not null,
  image        jsonb,
  is_published boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  type       announcement_type not null default 'notice',
  cta_label  text,
  cta_url    text,
  -- Date scheduled, so a mid year sale appears and retires on its own and
  -- nobody has to remember to take it down. See D36.
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  priority   int not null default 0,
  is_active  boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  constraint announcements_dates check (ends_at > starts_at)
);

create table analytics_events (
  id         bigserial primary key,
  event_type text not null,
  -- whatsapp_click and call_click carry the originating product or category,
  -- because those two leads LEAVE the site into channels analytics cannot
  -- follow, and that is the only signal we get.
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_type_idx on analytics_events (event_type, created_at desc);

alter table documents        enable row level security;
alter table blog_posts       enable row level security;
alter table testimonials     enable row level security;
alter table announcements    enable row level security;
alter table analytics_events enable row level security;

create policy documents_read_staff on documents for select
  using (current_user_role() is not null);
create policy documents_write_staff on documents for all
  using (current_user_role() is not null) with check (current_user_role() is not null);

create policy blog_read_published on blog_posts for select
  using (status = 'published');
create policy blog_read_staff on blog_posts for select
  using (current_user_role() is not null);
create policy blog_write on blog_posts for all
  using (current_user_role() in ('beco_editor','beco_admin','brightex_admin'))
  with check (current_user_role() in ('beco_editor','beco_admin','brightex_admin'));

create policy testimonials_read on testimonials for select using (is_published);
create policy testimonials_write on testimonials for all
  using (is_admin()) with check (is_admin());

create policy announcements_read_live on announcements for select
  using (is_active and now() between starts_at and ends_at);
create policy announcements_read_staff on announcements for select
  using (current_user_role() is not null);
create policy announcements_write on announcements for all
  using (is_admin()) with check (is_admin());

-- Anonymous writes events and can never read them back.
create policy analytics_insert_anon on analytics_events for insert with check (true);
create policy analytics_read_admin on analytics_events for select using (is_admin());

create trigger blog_posts_audit after insert or update or delete on blog_posts
  for each row execute function audit_trigger();
create trigger announcements_audit after insert or update or delete on announcements
  for each row execute function audit_trigger();
