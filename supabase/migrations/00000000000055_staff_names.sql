-- A salesperson reading a colleague's quote saw it as "Unassigned" and
-- "Prepared by: Website submission": the quote joins users for the owner's
-- name, and users_read_self only lets sales read their own row, so the
-- join came back empty and the screen took an empty name for nobody. That
-- invited a salesperson to claim a quote that was already someone's.
--
-- Widening users for sales would hand every salesperson colleagues' emails,
-- roles and flags. This returns only the display name, only for ids asked
-- about, and only to the roles that work with quotes and orders.

create or replace function staff_names(p_ids uuid[])
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.full_name
    from users u
   where u.id = any(p_ids)
     and current_user_role() in ('beco_sales', 'beco_admin', 'brightex_admin');
$$;

revoke execute on function staff_names(uuid[]) from public, anon;
grant execute on function staff_names(uuid[]) to authenticated;
