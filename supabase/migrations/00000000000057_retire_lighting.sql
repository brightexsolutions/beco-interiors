-- Lighting is retired. Beco no longer sells it.
--
-- Migration 13 seeded a Lighting category with no Drive folder behind it
-- because the brand guideline named it as a pillar (D47), and the importer
-- later met a real "Lights" folder of loose photographs. Beco's team have
-- since confirmed, through Brown on 3 October 2026, that lighting is no
-- longer part of the business. See D103.
--
-- Unpublished, not deleted. categories has no deleted_at, and the row is the
-- importer's identity for its source_path, so keeping it is what stops a
-- stray Drive folder from recreating the range. Anonymous readers only see
-- published categories (categories_read_published), so the shop, the
-- footer and the sitemap drop it on their own. Products filed under it are
-- soft deleted and unpublished, so a quote that already carries one still
-- points at a real row.

update categories
   set is_published = false
 where lower(slug) in ('lighting', 'lights')
    or upper(coalesce(source_path, '')) in ('LIGHTING', 'LIGHTS');

update products p
   set deleted_at = coalesce(p.deleted_at, now()),
       is_published = false
  from categories c
 where c.id = p.category_id
   and (lower(c.slug) in ('lighting', 'lights')
        or upper(coalesce(c.source_path, '')) in ('LIGHTING', 'LIGHTS'));
