-- Module access grants, D136. A named person can be let into a dashboard
-- section their role does not carry: a product manager who should see
-- quotes, a salesperson who should see reports. The grant opens the screen
-- and the reads behind it. Writes stay with the role, so a grant can never
-- widen what someone can change, only what they can see.
--
-- Who grants: an allowlisted Brightex admin, any module. A Beco person
-- holding the staff manage grant (D135), a module they themselves can reach,
-- on a Beco account only, never on themselves. The list of modules is one
-- function here and one constant in @beco/types, asserted equal by test.

alter table users
  add column if not exists module_grants text[] not null default '{}';

create or replace function module_keys() returns text[]
language sql
immutable
as $$
  select array['quotes', 'orders', 'customers', 'products', 'announcements', 'reports', 'users', 'settings', 'audit'];
$$;

alter table users drop constraint if exists users_module_grants_known;
alter table users
  add constraint users_module_grants_known
  check (module_grants <@ module_keys());

-- Does the signed-in, active account hold a module by grant. Role access is
-- decided by the existing policies; this is OR'd beside them.
create or replace function has_module(p_module text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p_module = any (u.module_grants)
    from users u
    where u.id = auth.uid()
      and u.is_active
  ), false);
$$;

grant execute on function has_module(text) to anon, authenticated;

-- The route map in lib/access.ts, as the database sees it: which roles
-- carry a module without any grant. Used to decide what a staff manager may
-- hand on: only what they hold themselves.
create or replace function role_covers_module(p_role user_role, p_module text) returns boolean
language sql
immutable
as $$
  select case p_module
    when 'quotes'        then p_role in ('beco_sales', 'beco_admin', 'brightex_admin')
    when 'orders'        then p_role in ('beco_sales', 'beco_admin', 'brightex_admin')
    when 'customers'     then p_role in ('beco_sales', 'beco_product_manager', 'beco_admin', 'brightex_admin')
    when 'products'      then p_role in ('beco_product_manager', 'beco_admin', 'brightex_admin')
    when 'announcements' then p_role in ('beco_admin', 'brightex_admin')
    when 'reports'       then p_role in ('beco_admin', 'brightex_admin')
    when 'settings'      then p_role in ('beco_admin', 'brightex_admin')
    when 'users'         then p_role = 'brightex_admin'
    when 'audit'         then p_role = 'brightex_admin'
    else false
  end;
$$;

-- Whether the caller may hand a module on. Brightex: always. A staff
-- manager: the modules they reach by role or by grant.
create or replace function can_grant_module(p_module text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_brightex_user() or (
    has_staff_manage()
    and p_module = any (module_keys())
    and (
      role_covers_module(current_user_role(), p_module)
      or has_module(p_module)
      or (p_module = 'users' and has_staff_manage())
      or (p_module = 'audit' and has_audit_read())
    )
  );
$$;

grant execute on function can_grant_module(text) to authenticated;

-- ---------- what a module grant opens to read ----------

drop policy if exists quotes_read_module on quotes;
create policy quotes_read_module on quotes for select
  using ((has_module('quotes') or has_module('reports')) and deleted_at is null);

drop policy if exists quote_items_read_module on quote_items;
create policy quote_items_read_module on quote_items for select
  using (has_module('quotes') or has_module('reports'));

drop policy if exists orders_read_module on orders;
create policy orders_read_module on orders for select
  using ((has_module('orders') or has_module('reports')) and deleted_at is null);

drop policy if exists order_items_read_module on order_items;
create policy order_items_read_module on order_items for select
  using (has_module('orders') or has_module('reports'));

-- A quote or an order names its customer, so those modules read the record
-- the row points at as well.
drop policy if exists customers_read_module on customers;
create policy customers_read_module on customers for select
  using (
    (has_module('customers') or has_module('quotes') or has_module('orders'))
    and deleted_at is null
  );

drop policy if exists analytics_read_module on analytics_events;
create policy analytics_read_module on analytics_events for select
  using (has_module('reports'));

drop policy if exists users_read_module on users;
create policy users_read_module on users for select
  using (has_module('users'));

-- The audit grant and the audit module are the same door.
create or replace function has_audit_read() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users u
    where u.id = auth.uid()
      and u.is_active
      and (u.role = 'brightex_admin' or u.can_read_audit or 'audit' = any (u.module_grants))
  );
$$;

-- Products, categories, announcements and settings already read for every
-- active role, so those modules are a route decision alone.

-- ---------- who may change the grants ----------

-- The self pin covers the new column.
drop policy if exists users_update_self_safe on users;
create policy users_update_self_safe on users for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role                 = (select role                 from users where id = auth.uid())
    and is_active            = (select is_active            from users where id = auth.uid())
    and must_change_password = (select must_change_password from users where id = auth.uid())
    and email                = (select email                from users where id = auth.uid())
    and last_login_at is not distinct from (select last_login_at from users where id = auth.uid())
    and can_write_blog       = (select can_write_blog       from users where id = auth.uid())
    and can_read_audit       = (select can_read_audit       from users where id = auth.uid())
    and can_manage_users     = (select can_manage_users     from users where id = auth.uid())
    and module_grants        = (select module_grants        from users where id = auth.uid())
  );

-- A new Beco account arrives with no module grants.
drop policy if exists users_insert_staff_manager on users;
create policy users_insert_staff_manager on users for insert
  with check (
    has_staff_manage()
    and role <> 'brightex_admin'
    and not can_manage_users
    and not can_read_audit
    and not can_write_blog
    and module_grants = '{}'
  );

create or replace function guard_users_staff() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_remaining int;
  v_added text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if not is_brightex_user() then
    if new.can_write_blog is distinct from old.can_write_blog
       or new.can_read_audit is distinct from old.can_read_audit
       or new.can_manage_users is distinct from old.can_manage_users then
      raise exception 'Only Brightex can assign those permissions'
        using errcode = 'P0001';
    end if;
  end if;

  -- Module grants: Brightex freely; a staff manager only what they hold
  -- themselves, never on their own row, never on a Brightex account.
  if new.module_grants is distinct from old.module_grants then
    if not is_brightex_user() then
      if not has_staff_manage() then
        raise exception 'Only Brightex can assign those permissions'
          using errcode = 'P0001';
      end if;
      if new.id = auth.uid() then
        raise exception 'You cannot change your own access'
          using errcode = 'P0001';
      end if;
      if old.role = 'brightex_admin' or new.role = 'brightex_admin' then
        raise exception 'Only Brightex manages a Brightex account'
          using errcode = 'P0001';
      end if;
      for v_added in
        select m from unnest(new.module_grants) as m
        where m <> all (old.module_grants)
      loop
        if not can_grant_module(v_added) then
          raise exception 'You can only grant access you hold yourself: %', v_added
            using errcode = 'P0001';
        end if;
      end loop;
    end if;
  end if;

  if has_staff_manage() and new.id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'You cannot change your own role'
        using errcode = 'P0001';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'You cannot deactivate your own account'
        using errcode = 'P0001';
    end if;
    if new.email is distinct from old.email then
      raise exception 'You cannot change your own email'
        using errcode = 'P0001';
    end if;
  end if;

  if old.role in ('beco_admin', 'brightex_admin')
     and old.is_active
     and (
       (not new.is_active)
       or (new.role is distinct from old.role)
     )
  then
    select count(*) into v_remaining
    from users u
    where u.role = old.role
      and u.is_active
      and u.id <> old.id;
    if v_remaining = 0 then
      raise exception 'Cannot deactivate or demote the last active admin of that role'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;
