---
name: supabase-migration
description: The required shape of a database migration, including its RLS policies and audit triggers. Use whenever adding or changing a table, column, index, or function.
---

# Supabase migration

One file per change in `supabase/migrations`. **A table does not exist without its RLS policies
and their tests in the same migration.** There is no follow up commit for policies.

## Every migration contains

1. The schema change
2. `alter table ... enable row level security`
3. Policies for every role that touches it, deny by default
4. An audit trigger, if the table has commercial meaning
5. A matching test file in `supabase/tests` proving each policy, see the `rls-policy` skill

## Rules

- **Soft delete** anything with commercial meaning: products, quotes, orders. Add `deleted_at`
  and filter it in every non admin policy, so the audit trail still points at a real record
- Money is `numeric`, never float
- Reference numbers come from a sequence inside a database function, never generated in
  application code, so two salespeople saving in the same second cannot collide
- Line item prices are stored on the line, never read live from `products`, so a quote issued
  last week does not silently reprice
- Timestamps are `timestamptz`. Always
- Generated types are regenerated and committed with the migration

## Before a migration merges

- [ ] RLS enabled
- [ ] A policy exists for every role that touches the table
- [ ] Tests prove anonymous cannot read or write what it should not
- [ ] Tests prove each Beco role cannot do what only `beco_admin` should
- [ ] Tests prove no Beco role can reach `brightex_admin` data
- [ ] An export of affected tables ran, per the backup rule
- [ ] `docs/SCHEMA.md` updated
