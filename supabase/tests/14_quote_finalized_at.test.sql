-- finalized_at is stamped by the database when a quote is decided, and
-- removed again if that decision is undone.
begin;
select plan(6);

\set q '''f4000000-0000-4000-8000-000000000001'''

insert into quotes (id, customer_name, customer_phone, source, status)
values (:q::uuid, 'Decide Me', '0700000090', 'walk_in', 'reviewing');

select is(
  (select finalized_at from quotes where id = :q::uuid),
  null,
  'a quote in flight carries no decision date'
);

update quotes set status = 'won' where id = :q::uuid;

select isnt(
  (select finalized_at from quotes where id = :q::uuid),
  null,
  'winning a quote stamps finalized_at'
);

-- The stamp must be the moment of the DECISION, not of the row's creation.
select ok(
  (select finalized_at >= created_at from quotes where id = :q::uuid),
  'the stamp is the decision time, never earlier than the quote itself'
);

-- An edit that does not touch status must leave the stamp alone, otherwise
-- every later tweak would re-date the win into the current month.
create temporary table _stamp as
  select finalized_at from quotes where id = :q::uuid;

update quotes set customer_name = 'Decided, Then Edited' where id = :q::uuid;

select is(
  (select finalized_at from quotes where id = :q::uuid),
  (select finalized_at from _stamp),
  'an unrelated edit does not move the decision date'
);

update quotes set status = 'lost', lost_reason = 'Changed their mind' where id = :q::uuid;

select isnt(
  (select finalized_at from quotes where id = :q::uuid),
  null,
  'moving straight from won to lost keeps a decision date'
);

update quotes set status = 'reviewing', lost_reason = null where id = :q::uuid;

select is(
  (select finalized_at from quotes where id = :q::uuid),
  null,
  'reopening a decided quote clears the date rather than leaving a false one'
);

select * from finish();
rollback;
