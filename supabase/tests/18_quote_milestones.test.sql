-- Milestone stamps persist: lost stays after reopen, first review is kept.
begin;
select plan(7);

\set q_new       '''a3700000-0000-4000-8000-000000000010'''
\set q_work      '''a3700000-0000-4000-8000-000000000011'''

insert into quotes (id, customer_name, customer_phone, source, status)
values
  (:q_new::uuid,  'New Web', '0700000010', 'web',     'new'),
  (:q_work::uuid, 'Counter', '0700000011', 'walk_in', 'reviewing');

select is(
  (select reviewing_at is null from quotes where id = :q_new::uuid),
  true,
  'a new website quote has no reviewed date yet'
);

select isnt(
  (select reviewing_at from quotes where id = :q_work::uuid),
  null,
  'a counter quote raised as reviewing is stamped reviewed'
);

update quotes set status = 'quoted' where id = :q_work::uuid;

select isnt(
  (select quoted_at from quotes where id = :q_work::uuid),
  null,
  'moving to quoted stamps quoted_at'
);

update quotes set status = 'lost', lost_reason = 'Went elsewhere' where id = :q_work::uuid;

select isnt(
  (select lost_at from quotes where id = :q_work::uuid),
  null,
  'moving to lost stamps lost_at'
);

select is(
  (select quoted_at is not null from quotes where id = :q_work::uuid),
  true,
  'quoted_at survives being marked lost'
);

update quotes set status = 'reviewing', lost_reason = null where id = :q_work::uuid;

select isnt(
  (select reopened_at from quotes where id = :q_work::uuid),
  null,
  'leaving lost for reviewing stamps reopened_at'
);

select isnt(
  (select lost_at from quotes where id = :q_work::uuid),
  null,
  'lost_at is kept after reopen so Dates can still show when it was lost'
);

select * from finish();
rollback;
