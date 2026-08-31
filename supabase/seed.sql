-- Staging seed. FICTIONAL customers only.
--
-- Staging is NEVER cloned from production. quotes and orders hold real
-- customer names, phone numbers and email addresses, and copying them into a
-- lower environment that more people can reach is a data protection problem
-- under Kenya's Data Protection Act 2019, and a needless one.
--
-- Real products are fine: they are not personal data, and the import pipeline
-- puts them here anyway.
--
-- Seeding rather than cloning also makes staging deterministic, so a failing
-- test means a real regression rather than someone having edited a row.

insert into settings (key, value) values
  ('brightex_allowed_emails', '["info.brightexsolutions@gmail.com"]'::jsonb)
on conflict (key) do update set value = excluded.value;

-- Fictional staff, fictional customers, real product names. Filled in at M1.
