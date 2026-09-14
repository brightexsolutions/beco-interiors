-- Staging and local seed. FICTIONAL customers only.
--
-- Staging is NEVER cloned from production. quotes and orders hold real
-- customer names, phone numbers and email addresses, and copying them into a
-- lower environment that more people can reach is a data protection problem
-- under Kenya's Data Protection Act 2019, and a needless one. See D44.
--
-- Real PRODUCTS are fine: they are not personal data, and the import pipeline
-- puts them here anyway. Seeding rather than cloning also makes staging
-- deterministic, so a failing test means a real regression rather than
-- someone having edited a row.

insert into settings (key, value) values
  ('brightex_allowed_emails', '["info.brightexsolutions@gmail.com"]'::jsonb),
  ('whatsapp_number', '"254722333730"'::jsonb),
  ('business_phone', '"+254722333730"'::jsonb)
on conflict (key) do update set value = excluded.value;

-- The real category, named from the Drive folder so the taxonomy stays
-- traceable to its source.
--
-- Kept as a safety net rather than as the source of the id. Migration 13 seeds
-- the whole taxonomy and runs first, so this insert always loses the conflict
-- and the row that survives carries a GENERATED uuid. Referring to a hardcoded
-- id below therefore pointed at a row that never existed, and every product
-- insert failed the foreign key, which broke `supabase db reset` outright.
-- The id is resolved from source_path instead, which is the category's
-- identity per migration 11 and cannot drift.
insert into categories (name, slug, description, is_published, source_path)
values (
  -- Slug derived from the Drive folder, matching what the importer
  -- produces. A hand written slug here split this category in two.
  '12mm Sintered Stones', '12mm-sintered-stones',
  null,   -- real copy comes from Beco. A grid alone does not rank.
  true,
  '12MM SINTERED STONES'
) on conflict (source_path) do nothing;

-- The 24 real stones used to be inserted here, bare and POA.
--
-- They now live in migration 20, WITH their prices, descriptions and specs,
-- because migrations run before this file: migration 15 was updating rows that
-- did not exist yet, so a reset produced a catalogue with no prices at all.
-- Catalogue rows are not fixtures, and this file is for fixtures.
--
-- What stays here is what a seed is actually for: settings, a live
-- announcement, and fictional customers. Never anything cloned from
-- production, per rule 6.

-- One live announcement, so the bar is exercised rather than only built.
--
-- Deliberately a plain notice and a verifiable one: the stones really are on
-- the floor at Urban Square. No invented sale, no invented discount, and no
-- response time promise, because none of those have been confirmed. Beco
-- replaces this from /dashboard/announcements at M5, and it retires on its own
-- when ends_at passes even if nobody does.
insert into announcements (title, body, type, cta_label, cta_url, starts_at, ends_at, priority)
values (
  'Now on the floor',
  'The full 12mm sintered stone range is in the Urban Square showroom.',
  'notice',
  'Plan a visit',
  '/contact',
  now() - interval '1 day',
  now() + interval '180 days',
  10
) on conflict do nothing;

-- PLACEHOLDER client credentials, requested by Brown 14 September so the
-- ClientShowcase section, and its testimonial quote from migration 26,
-- render as something rather than nothing while real ones are pending.
--
-- Named like real businesses rather than "Sample X", on request, so the
-- section reads naturally rather than announcing itself as a placeholder.
-- That makes the comment here the only thing keeping these honest: neither
-- name is a real company, Beco has not supplied real project names,
-- sectors or quotes yet, and has not recorded permission for any real
-- client per migration 10's own consent gate. Replace every row, not just
-- the names, the moment Beco sends real credentials and signs off on
-- naming them, and never let this seed run anywhere but local and staging.
insert into clients (name, slug, project, sector, testimonial, has_permission, is_published, sort_order)
values
  (
    'Amberline Hospitality', 'amberline-hospitality',
    'Sintered stone counters and wall panels across three outlets.',
    'Hospitality',
    'Beco fitted our counters on schedule, and the material has held up to daily service without a mark on it.',
    true, true, 10
  ),
  (
    'Greenridge Developments', 'greenridge-developments',
    'Kitchen and vanity worktops for a 40 unit residential development.',
    'Residential development',
    'The sales team understood what we needed for a project this size and priced it fast enough to keep our own schedule.',
    true, true, 20
  ),
  -- A third, an individual homeowner rather than a company, requested
  -- 14 September so the section shows the residential side of the client
  -- base too, not only corporate work.
  (
    'David Mwangi', 'david-mwangi',
    'Kitchen and bathroom worktops for a family home in Kileleshwa.',
    'Homeowner',
    'I visited the showroom undecided and left with a slab I actually love. The team was patient through three changes of mind.',
    true, true, 30
  )
on conflict (slug) do update
  set project = excluded.project, sector = excluded.sector, testimonial = excluded.testimonial;
