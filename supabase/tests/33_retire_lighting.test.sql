-- Lighting is retired: unpublished for anon, kept for the importer. Migration 57.
begin;
select plan(5);

-- A product that was in Lighting, as the live import created one from the
-- "Lights" folder, is soft deleted and hidden by the migration. Re-run the
-- migration's own statement against a row inserted here, since the seed
-- holds no lighting product.
insert into products (name, slug, category_id, unit, price_display_mode, availability, is_published)
select 'Pendant Test', 'pendant-test', id, 'per piece', 'poa', 'poa', true
  from categories where slug = 'lighting';

update products p
   set deleted_at = coalesce(p.deleted_at, now()), is_published = false
  from categories c
 where c.id = p.category_id and lower(c.slug) in ('lighting', 'lights');

select is(
  (select is_published from categories where slug = 'lighting'),
  false,
  'the Lighting category is unpublished'
);

select isnt_empty(
  $$select 1 from categories where slug = 'lighting' and source_path = 'LIGHTING'$$,
  'the row and its source_path are kept, so a Drive folder cannot recreate the range'
);

select is(
  (select deleted_at is not null and not is_published from products where slug = 'pendant-test'),
  true,
  'a product filed under Lighting is soft deleted and unpublished, never hard deleted'
);

set local role anon;

select is_empty(
  $$select 1 from categories where slug = 'lighting'$$,
  'anon no longer sees Lighting, so the shop, footer and sitemap drop it'
);

select is_empty(
  $$select 1 from products where slug = 'pendant-test'$$,
  'anon no longer sees a lighting product'
);

select * from finish();
rollback;
