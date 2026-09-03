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
