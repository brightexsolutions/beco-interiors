-- A category is identified by the Drive folder it came from, not by its slug.
--
-- The slug is derived from the folder name and is editable in the dashboard.
-- Keying the import on it meant an edited slug came back as a SECOND category
-- on the next run. That already happened: the seeded row carried the hand
-- written slug "sintered-stones-12mm" while the importer derived
-- "12mm-sintered-stones" from the same folder, so one Drive folder became two
-- rows and the empty one would have shipped as a real, indexable page.
--
-- source_path is the traceable identity the naming convention already asks
-- for, so it becomes the conflict target and the database enforces it.

-- The importer's slug rule, in SQL, so the merge below can tell which rows
-- describe the same Drive folder. Immutable because it is used in an index.
create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Merge before constraining, or the constraint cannot be added.
--
-- Two rows are the same category when their source paths slugify to the same
-- value. The survivor is the row whose source_path is a genuine Drive folder
-- name rather than a slug that was written back into the column, because that
-- is the one carrying real provenance. Creation order is the tiebreak.
create temporary table category_merge on commit preserve rows as
with ranked as (
  select id,
         slugify(source_path) as key,
         row_number() over (
           partition by slugify(source_path)
           order by (source_path <> slugify(source_path)) desc, created_at
         ) as rank
    from categories
   where source_path is not null
)
select r.id as dup_id, k.id as keep_id
  from ranked r
  join ranked k on k.key = r.key and k.rank = 1
 where r.rank > 1;

update products p
   set category_id = m.keep_id
  from category_merge m
 where p.category_id = m.dup_id;

-- The losing rows now hold nothing. Deleted outright rather than soft deleted:
-- these are duplicates that should never have existed, not records with
-- commercial meaning. The guard proves the move above actually emptied them.
delete from categories c
 using category_merge m
 where c.id = m.dup_id
   and not exists (select 1 from products p where p.category_id = c.id);

-- Align the surviving slug with what its folder name derives to, so the seed
-- and the importer agree and neither can recreate the split.
update categories set slug = slugify(source_path)
 where source_path is not null and slug <> slugify(source_path);

drop table category_merge;

-- Repair rows whose source_path was written as a slug rather than the folder
-- it came from. import_files holds the real Drive paths, so provenance is
-- recovered from the record rather than guessed from the slug.
update categories c
   set source_path = real.folder
  from (select distinct split_part(path, '/', 1) as folder from import_files) real
 where slugify(real.folder) = slugify(c.source_path)
   and c.source_path <> real.folder;

update products p
   set source_path = real.path
  from (select distinct split_part(path, '/', 1) || '/' || split_part(path, '/', 2) as path
          from import_files) real
 where slugify(real.path) = slugify(p.source_path)
   and p.source_path <> real.path;

alter table categories
  add constraint categories_source_path_unique unique (source_path);
