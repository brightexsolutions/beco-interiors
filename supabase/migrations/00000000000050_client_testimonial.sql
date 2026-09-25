-- A short quote from a named, permitted client, shown beside the project
-- credential on the storefront.
--
-- Deliberately one text field on the existing row rather than a new table:
-- the requirement from Brown is a single written quote per client, not a
-- rating or multiple quotes, and clients already carries the consent gate
-- (has_permission) and the publish gate (is_published) this needs. A quote
-- inherits both for free by living on the same row; a separate table would
-- have to re-derive them.
--
-- Nullable and optional everywhere: most published clients will have a
-- project credential with no quote attached, and ClientShowcase already
-- renders a client with nothing set beyond its name.
alter table clients add column testimonial text;

-- No RLS change: clients_read_published, clients_read_staff and
-- clients_write_admin from migration 10 already gate the whole row, and this
-- is one more column on it, not a new access path.
