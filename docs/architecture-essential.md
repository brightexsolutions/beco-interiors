# Architecture, the essential version

The whole system on one page. `docs/ARCHITECTURE.md` has sixteen flows drawn in detail. This is
what you need to hold in your head.

---

## The shape

```
   BUYER                         BECO STAFF and BRIGHTEX
     |                                    |
     v                                    v
  www.beco.co.ke                 dashboard.beco.co.ke
  anon key only                  service role, server only
                                   |
                                   +-- /dashboard/studio
                                       Brightex only, gated by
                                       role AND email allowlist
     |                                    |
     +------------------+-----------------+
                        |
                    CLOUDFLARE  (Beco's account)
                    WAF, 1 rate limit rule, edge cache
                                |
                +---------------+---------------+
                |                               |
           SUPABASE                      CLOUDFLARE R2
           Postgres, Auth,               product images
           PDFs. RLS is the              img.beco.co.ke
           security model                10GB free
                ^
                |
        tools/drive-import  <----  GOOGLE DRIVE
        service account             the photography
                                    source of truth
```

**Two** deployments from one monorepo. The split is a security boundary, not a convenience:
the storefront can never receive an admin secret, so compromising it yields the anon key that
every visitor's browser already holds.

Studio is not a third app. It is routes inside the dashboard, because that boundary was always
about the public site not reaching admin tools, never about separating two authenticated admin
surfaces sharing one database and one role system.

## Five things that explain most decisions

**1. The quote is the product.** Not the catalog. Two intake paths, web and counter, converge
on one data model and one document. Everything else serves that.

**2. Free tier shapes the architecture, it is not worked around.** Images processed once at
import rather than per request. Catalog pages static so a visitor never touches the database.
Images on R2 where egress is free. The result: **more traffic does not quickly cost more money.
A bigger catalog does.**

**3. Beco owns the infrastructure. Brightex owns the code.** Database, DNS, images, email and
monitoring are all in Beco's accounts. Brightex holds the repository, two Vercel projects and
its own Gemini key. If Brightex vanished, the site keeps serving; only future changes stop.

**3b. The signature scroll section is built from the image roles**, not from new photography.
A bookmatch slab parts along its mirror seam, then each stone runs slab to on stand to
application. It scales to every future category automatically because it is the data model.

**4. Content arrives late and messy, so nothing may block on it.** Templates are data driven.
The import pipeline is incremental and reports what it skipped rather than guessing. Empty
categories are `noindex` until they have products, then flip automatically.

**5. RLS is the security model.** Deny by default on every table, enforced in Postgres. Route
middleware is the second layer. The UI is not a layer at all: hiding a button is not access
control.

## Data model, the core of it

```
  categories --< products
                    |
                    +--< quote_items >-- quotes --+
                    |                             |
                    +--< order_items >-- orders <-+  (won quote converts)
                                            |
                            documents >------+  PDFs, who sent, when
                            audit_log        every meaningful action
```

Four things about it that matter:

- **`price_display_mode` is separate from `availability`.** A card can say In Stock and POA at
  once without ambiguity, and ambiguity here costs sales
- **Line prices are stored on the line**, never read live from `products`. A quote issued last
  week does not silently reprice
- **`quote_items.product_id` is nullable** with a description snapshot, so an item not in the
  catalog never blocks a quote at the counter
- **Soft delete** on anything with commercial meaning, so the audit trail points at a real row

## The request path

```
  visitor -> Cloudflare edge -> Vercel static page -> (no database)
  images  -> Cloudflare edge -> R2

  staff edits a price -> server action -> Supabase -> revalidateTag
                                                   -> that page rebuilds, others do not
```

## Where the code lives

```
  apps/storefront    public
  apps/dashboard     Beco operations, plus /studio for Brightex
  packages/ui        tokens and components. Nothing invents its own colour
  packages/types     generated from the database
  packages/validation  zod schemas, shared, server authoritative
  packages/documents   PDF and email templates
  tools/drive-import   the pipeline
  supabase/migrations  schema and RLS together, always
```

## Non negotiables

- No em dashes, anywhere
- Every piece of logic has a test. No Playwright, no browser automation
- No decorative controls. Every button proven to do what it says
- Service role key never in the storefront
- A table does not exist without its RLS policies and their tests
- Nothing below 16px
- Type floor, contrast and performance budgets enforced in CI, not trusted

## Read next

| For | Read |
|---|---|
| What it must do | `docs/PRD.md` |
| Every flow, drawn | `docs/ARCHITECTURE.md` |
| Why a decision was made | `docs/DECISIONS.md`, `files/BUILD-PLAN.md` |
| Known weaknesses | `docs/REVIEW.md` |
| How to deploy it | `docs/DEPLOYMENT.md` |
