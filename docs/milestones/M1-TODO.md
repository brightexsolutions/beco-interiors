# M1: Foundation and infrastructure

Per CLAUDE.md rule 8. **An item is ticked because it was CHECKED, not because it was written.**
Anything written but unverified stays unticked and says so.

Status key: `[ ]` not started, `[~]` written, not yet verified, `[x]` verified against reality.

## Schema and RLS

| | Item | State |
|---|---|---|
| `[~]` | Enums, sequences, reference number functions | Written. Not replayed |
| `[~]` | `users`, `settings`, D42 Studio gate | Written. Not replayed |
| `[~]` | `audit_log` and trigger | Written. Not replayed |
| `[~]` | `categories`, `products`, `product_slugs` | Written. Not replayed |
| `[~]` | `quotes`, `quote_items` | Written. Not replayed |
| `[~]` | `orders`, `order_items`, circular FK | Written. Not replayed |
| `[~]` | `documents`, `blog_posts`, `testimonials`, `announcements`, `analytics_events` | Written. Not replayed |
| `[~]` | `import_files`, `import_runs`, `import_issues`, `import_state` | Written. Not replayed |

**Nothing above is proven.** `supabase db reset` has never run against these files, so syntax
errors, ordering problems and bad references are all still possible. The circular foreign key
between `quotes.converted_order_id` and `orders.quote_id` is the most likely thing to be wrong.

## Constraints worth proving, not just writing

- [ ] A POA product cannot carry a price, and a fixed price product must have one
- [ ] `payment_status` and `paid_at` cannot disagree
- [ ] A published blog post cannot lack `cover_image_alt`
- [ ] `line_total` is generated and cannot disagree with quantity times unit price
- [ ] Renaming a product records the old slug, so the old URL can 301

## Policy tests, proving the NEGATIVE

- [ ] anon cannot read an unpublished product
- [ ] anon cannot read any quote or order
- [ ] anon CAN insert a quote, since the storefront needs that
- [ ] anon cannot read back the quote it just inserted
- [ ] `beco_sales` cannot write another salesperson's quote
- [ ] `beco_sales` cannot change its own role
- [ ] `beco_product_manager` cannot touch quotes or users
- [ ] `beco_editor` can write only blog posts
- [ ] no Beco role reaches `brightex_admin` data
- [ ] a soft deleted product is invisible to anon
- [ ] an inactive user can do nothing at all
- [ ] `is_brightex_user()` is false for a matching role with a non allowlisted email

## Seed

- [ ] `supabase/seed.sql`, fictional customers only, never cloned from production

## Verify, the gate for calling M1 done

- [ ] `supabase db reset` replays every migration from scratch, twice
- [ ] `supabase test db` green
- [ ] `pnpm db:types` regenerates and both apps still typecheck
- [ ] `pnpm test:unit` still green

## Blocked, and correctly so

- [ ] `beco-staging` Supabase project. **Beco has created `beco-prod` only.** Nothing here
      links to prod at any point, per D44
- [ ] Vercel projects, Cloudflare, DNS, keep alive, backup workflow. All need accounts, none
      blocks local work

## Environment note

`supabase start` is **entirely local**. No cloud login, no hosted project, no link. First run
pulls roughly 4GB of Docker images, which is slow on a constrained connection but happens once.
