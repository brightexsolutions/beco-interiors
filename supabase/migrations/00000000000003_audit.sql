-- Audit log and its trigger.
--
-- Written BY TRIGGER, not by application code, so it cannot be forgotten
-- when someone adds a new write path. Logging goes in as each feature is
-- built, never in a catch up pass.

create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id),
  action       audit_action not null,
  entity_type  text not null,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  ip           inet,
  -- clock_timestamp(), not now(). now() returns TRANSACTION start time, so
  -- every row written in one transaction would share a timestamp and the
  -- trail could not be ordered within it. An audit log that cannot say what
  -- happened first is a weaker audit log.
  created_at   timestamptz not null default clock_timestamp()
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id, created_at desc);
create index audit_log_user_idx   on audit_log (user_id, created_at desc);

-- Soft delete counts as a delete for audit purposes, which is the point:
-- deletions of anything with commercial meaning stay visible in the trail.
create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_action audit_action;
  v_before jsonb;
  v_after  jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'create'; v_after := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_action := 'delete'; v_before := to_jsonb(old);
  else
    v_before := to_jsonb(old); v_after := to_jsonb(new);
    -- Compare through jsonb, never `old.deleted_at`. PL/pgSQL resolves a
    -- record field reference even when the guard before it is false, so
    -- naming the column directly breaks this trigger on every table that
    -- does not have it. `users` is one, and the failure only surfaced once a
    -- users UPDATE finally got past RLS.
    if (v_before ? 'deleted_at')
       and v_before ->> 'deleted_at' is null
       and v_after  ->> 'deleted_at' is not null then
      v_action := 'delete';
    else
      v_action := 'update';
    end if;
  end if;

  insert into audit_log (user_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), v_action, tg_table_name,
          coalesce((v_after->>'id')::uuid, (v_before->>'id')::uuid), v_before, v_after);

  return coalesce(new, old);
end;
$$;

alter table audit_log enable row level security;

-- Readable by admins only, and readable at all, because an audit trail
-- nobody can read is not an audit trail.
create policy audit_read_admin on audit_log for select using (is_admin());
-- No insert policy: rows arrive only through the security definer trigger.

create trigger users_audit after insert or update or delete on users
  for each row execute function audit_trigger();
