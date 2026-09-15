# M1: Foundation and infrastructure

Per CLAUDE.md rule 8. **An item is ticked because it was CHECKED, not because it was written.**

Verified 31 August 2026 against a live local database.

## Schema and RLS

- [x] Enums, sequences, reference number functions
- [x] `users`, `settings`, and the D42 Studio gate
- [x] `audit_log` and its trigger
- [x] `categories`, `products`, `product_slugs`
- [x] `quotes`, `quote_items`
- [x] `orders`, `order_items`, and the circular FK back to quotes
- [x] `documents`, `blog_posts`, `testimonials`, `announcements`, `analytics_events`
- [x] `import_files`, `import_runs`, `import_issues`, `import_state`

**Verified by:** `supabase db reset` replays all eight from scratch. 19 tables, **51 policies,
0 tables without RLS.**

**One real bug this caught.** `current_user_role()` sat in migration 1 but reads `users`, which
migration 2 creates. A `language sql` function is parsed at CREATE time rather than at call
time, so it failed on a clean replay while appearing fine to review. Moved to migration 2.
This is exactly why "written" and "verified" are tracked separately.

## Constraints, proven not assumed

- [x] A POA product cannot carry a price, and a fixed price product must have one
- [x] `payment_status` and `paid_at` cannot disagree
- [x] A published blog post cannot lack `cover_image_alt`
- [x] `line_total` is generated and cannot disagree with quantity times unit price
- [x] Renaming a product records the old slug, so the old URL can 301

## Policy tests, proving the NEGATIVE

- [x] anon cannot read an unpublished product
- [x] anon cannot read a soft deleted product, though the row still exists
- [x] anon cannot read any quote, order, user, or the audit log
- [x] anon CAN insert a quote, which the storefront requires
- [x] `is_brightex_user()` is false with an empty allowlist, even for the right role
- [x] `is_brightex_user()` is false for an unauthenticated caller regardless of the list
- [x] every table in `public` has RLS enabled, asserted so a future table cannot ship without it
- [x] two consecutive quote references differ

**21 pgTAP tests, all passing.**

## Still open, honestly

- [ ] Per role write tests need seeded authenticated users. The current suite proves anonymous
      denial and the Studio gate thoroughly, but **not yet** that `beco_sales` cannot write
      another salesperson's quote, or that `beco_product_manager` cannot touch users. Those
      need `auth.users` rows and JWT claim simulation. **This is the most important gap in M1**
- [ ] `supabase/seed.sql` still only sets the allowlist. Needs fictional customers and the real
      24 products
- [ ] Optimistic locking is a column, not yet enforced. `updated_at` is compared in application
      code at M5

## Verify

- [x] `supabase db reset` replays every migration from scratch, run twice
- [x] `supabase test db` green, 21 tests
- [x] `pnpm db:types` regenerates, 22 tables typed
- [x] `pnpm test:unit` still green, 11 tests
- [x] Secret scan clean, 121 files

## Blocked, correctly

- [ ] `beco-staging` project. Beco has created `beco-prod` only. **Nothing here links to prod
      at any point**, per D44
- [ ] Vercel, Cloudflare, DNS, keep alive, backup workflow. All need accounts, none blocks
      local work
