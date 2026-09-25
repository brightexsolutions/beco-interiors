-- The dashboard's login lifecycle, per ARCHITECTURE section 11 and M5 section A.
--
-- Three things happen to a `users` row around sign-in that are NOT a user's
-- to do by hand:
--
--   1. `last_login_at` is stamped on every successful sign-in.
--   2. `must_change_password` is cleared once, when the forced change is done.
--   3. a `login` row lands in `audit_log` (which takes no direct insert, only
--      the security-definer trigger, so this needs a definer function too).
--
-- All three run as SECURITY DEFINER functions the signed-in user may execute,
-- rather than through a broad self-update policy on `users`. `users` holds the
-- role, the active flag and the forced-change flag: a write path a crafted
-- request could reach must not be able to move any of them.

-- ---------------------------------------------------------------------------
-- record_sign_in(): stamp last_login_at, write the login audit row.
-- Called by the dashboard sign-in action right after Supabase Auth accepts
-- the password. A no-op for an inactive user (belt and braces: the sign-in
-- action already refuses them).
-- ---------------------------------------------------------------------------
create or replace function record_sign_in() returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  -- clock_timestamp(), not now(): last_login_at is the wall-clock instant of
  -- this sign-in, not the transaction boundary, the same reason audit_log
  -- timestamps use it. last_login_at only: not a content edit, so
  -- `updated_at` is left for real changes.
  update users
     set last_login_at = clock_timestamp()
   where id = v_uid
     and is_active;

  if not found then
    return;
  end if;

  -- audit_log has no insert policy: rows arrive through a definer path only.
  insert into audit_log (user_id, action, entity_type, entity_id, after)
  values (v_uid, 'login', 'users', v_uid, jsonb_build_object('at', now()));
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_first_login(): clear the forced-change flag, once.
-- Called by the change-password action AFTER Supabase Auth has accepted the
-- new password. The `and must_change_password` predicate makes a second call
-- a no-op, so the users audit trigger fires exactly once for the transition
-- true -> false and the trail is not littered with empty updates.
-- ---------------------------------------------------------------------------
create or replace function complete_first_login() returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  update users
     set must_change_password = false,
         updated_at           = now()
   where id = v_uid
     and is_active
     and must_change_password;
end;
$$;

-- Supabase's default privileges in `public` grant EXECUTE to anon and
-- authenticated at CREATE time, so revoking from PUBLIC alone leaves anon in.
-- These are for a signed-in user only.
revoke all on function record_sign_in() from public, anon;
revoke all on function complete_first_login() from public, anon;
grant execute on function record_sign_in() to authenticated;
grant execute on function complete_first_login() to authenticated;

-- ---------------------------------------------------------------------------
-- Narrow users_update_self_safe.
--
-- It let a user update their own row as long as `role` was unchanged, which
-- also left `must_change_password`, `is_active` and `email` writable from a
-- crafted self-request. Lock each of them to its stored value, the same
-- subquery idiom the policy already used for `role`. `full_name` stays
-- editable so a future "my profile" screen needs no migration; everything
-- security-relevant now moves only through `users_write_brightex` (an admin)
-- or the two definer functions above.
-- ---------------------------------------------------------------------------
drop policy users_update_self_safe on users;
create policy users_update_self_safe on users for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role                 = (select role                 from users where id = auth.uid())
    and is_active            = (select is_active            from users where id = auth.uid())
    and must_change_password = (select must_change_password from users where id = auth.uid())
    and email                = (select email                from users where id = auth.uid())
    and last_login_at is not distinct from (select last_login_at from users where id = auth.uid())
  );
