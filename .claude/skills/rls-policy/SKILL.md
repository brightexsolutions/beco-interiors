---
name: rls-policy
description: Write and adversarially test a row level security policy. Use for any policy work, and for the Codex review pass that tries to break existing policies.
---

# RLS policy

Writing a policy and proving a role cannot bypass it are different jobs. This skill is the
second one. It is the layer most projects skip and the one that matters most here, because the
dashboard holds pricing, stock and revenue.

## Roles

`beco_admin`, `beco_sales`, `beco_product_manager`, `beco_editor`, `brightex_admin`, plus
anonymous.

| Role | Can |
|---|---|
| anonymous | `select` published products, categories, posts, testimonials. `insert` quotes, quote_items, orders, order_items, analytics_events through rate limited server actions only |
| `beco_sales` | Read all quotes, write only its own unless an admin reassigns |
| `beco_product_manager` | Write products, categories, stock. Never quotes or users |
| `beco_editor` | Write blog posts only |
| `beco_admin` | All Beco data and staff reports |
| `brightex_admin` | Everything including users. No Beco role reaches anything gated to it |

**Studio routes require two independent conditions**, both enforced in Postgres, per D42:

```sql
create or replace function is_brightex_user() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from users u
    where u.id = auth.uid()
      and u.is_active
      and u.role = 'brightex_admin'
      and u.email = any (
        select jsonb_array_elements_text(value)
        from settings where key = 'brightex_allowed_emails'
      )
  );
$$;
```

**An explicit address list, not a domain suffix.** Brightex's real addresses are gmail.com, so
a suffix check would match every Gmail account in existence. Test that specifically.

Two conditions means a wrongly escalated role still cannot reach Studio, and revoking access is
removing one string from a list rather than a migration.

## Testing, in pgTAP, per table

Prove the negative, not just the positive. For every table:

1. Anonymous cannot read what it should not
2. Anonymous cannot write what it should not
3. Each Beco role cannot do what only `beco_admin` should
4. No Beco role can read `brightex_admin` data
5. A soft deleted row is invisible to non admin reads
6. A user with `is_active = false` cannot do anything at all

## Adversarial pass

Do not re read what the author wrote. Try to break it:

- Can a `beco_sales` user update `assigned_to` to give themselves someone else's quote?
- Can they change their own `role`?
- Can an `insert` set `created_by` to another user?
- Does a policy leak through a view, a function, or a foreign key join?
- Is anything reachable with the anon key that should not be?
