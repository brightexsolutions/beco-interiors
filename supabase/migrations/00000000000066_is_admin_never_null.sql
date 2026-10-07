-- is_admin() answers false, never null, for an account that is not active.
--
-- Found while testing remove_quote_line (D131). current_user_role() returns
-- null for a deactivated account, so is_admin() returned null too, and every
-- quote and order function opens with
--
--   if current_user_role() is distinct from 'beco_sales' and not is_admin()
--
-- `not null` is null, `true and null` is null, and IF treats null as false:
-- the guard let a deactivated account through. The owner check after it,
-- `not is_admin() and v_assigned is distinct from v_uid`, fails the same
-- way, so a deactivated salesperson whose token had not yet expired could
-- still edit, claim, reopen, convert or cancel through the RPCs. The proxy
-- signs such an account out on its next page load (D83), but a direct call
-- with the old token never touches the proxy.
--
-- One function fixed rather than twenty callers: every policy that reads
-- is_admin() uses it positively (`using (is_admin())`, `is_admin() or ...`),
-- where false and null both deny, so nothing that was refused becomes
-- allowed. supabase/tests/42_is_admin_never_null.test.sql proves the
-- function and two of its callers.

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_user_role() in ('beco_admin', 'brightex_admin'), false);
$$;
