# Architecture

Reference BEC-2026-004-PLAN. Sketches of how each flow actually runs. Diagrams are ASCII on
purpose: they read in a terminal, in an editor, and in an agent's context without a render
step, and they diff line by line.

Full reasoning behind every choice is in `files/BUILD-PLAN.md`.

## Contents

1. System overview
2. Deployment and trust boundaries
3. Storefront request lifecycle
4. Quote flow, path A: web
5. Quote flow, path B: the counter
6. Convergence: status lifecycle and order conversion
7. Fixed price order path
8. Drive import pipeline
9. Image derivative pipeline
10. Document generation and send
11. Auth and account lifecycle
12. Authorization: two enforcement layers
13. Analytics and the conversion funnel
14. Backup and restore
15. Announcement lifecycle
16. Blog authoring with Gemini
17. Live updates on the dashboard

---

## 1. System overview

```
                            BECO'S TEAM              A BUYER
                                 |                      |
                                 v                      v
   +--------------------------------------+  +------------------------+
   |  dashboard.beco.co.ke                |  |  www.beco.co.ke        |
   |  Next.js, service role, server only  |  |  Next.js, anon key     |
   |  quotes, stock, orders, reports,     |  |  catalog, quote cart,  |
   |  users, announcements, imports       |  |  blog, gallery         |
   |                                      |  +------------------------+
   |  /dashboard/studio  <-- Brightex only|             /
   |  blog authoring, reporting           |            /
   |  gated by role AND email allowlist   |           /
   +--------------------------------------+          /
                     \                              /
                      v                            v
             +------------------------------------------+
             |   CLOUDFLARE   zone on Beco's account    |
             |   WAF, 1 rate limit rule, edge cache     |
             +------------------------------------------+
                      |                        |
                      v                        v
             +-----------------+     +----------------------+
             |   SUPABASE      |     |  CLOUDFLARE R2       |
             |   Postgres      |     |  img.beco.co.ke      |
             |   Auth          |     |  product derivatives |
             |   Storage (PDFs)|     |  10GB free, no egress|
             +-----------------+     +----------------------+
                      ^                        ^
                      |                        |
             +----------------------------------------+
             |  tools/drive-import                    |
             |  service account, changes feed         |
             +----------------------------------------+
                                ^
                                |
                       +------------------+
                       |  GOOGLE DRIVE    |
                       |  BECO PRODUCTS   |
                       |  source of truth |
                       |  for photography |
                       +------------------+

   Out to the world:  RESEND (quote and order email, from beco.co.ke)
                      wa.me   (click to chat, prefilled)
                      tel:    (the business line)
                      GA4     (mirrored from analytics_events)
```

Drive is the source of truth for photography. The database is the source of truth for
everything else. Product images are regenerable from Drive by re running the import, which is
why they are excluded from backups and why R2 is not a data ownership question the way Postgres
is.

---

## 2. Deployment and trust boundaries

Three separate Vercel projects, so a public site issue can never reach admin tools. This is the
whole point of the split.

```
  +--------------------------------------------------------------+
  |  STOREFRONT PROJECT                            PUBLIC         |
  |                                                               |
  |  NEXT_PUBLIC_SUPABASE_URL                                     |
  |  NEXT_PUBLIC_SUPABASE_ANON_KEY   <- scoped entirely by RLS    |
  |                                                               |
  |  Has no admin secret. Cannot be given one. If this app is     |
  |  fully compromised, the attacker holds the anon key, which    |
  |  is the same key any visitor's browser already holds.         |
  +--------------------------------------------------------------+

  +--------------------------------------------------------------+
  |  DASHBOARD PROJECT                        AUTHENTICATED       |
  |                                                               |
  |  SUPABASE_SERVICE_ROLE_KEY       server only, never bundled   |
  |  RESEND_API_KEY                  server only                  |
  |  R2 credentials                  server only                  |
  |  GEMINI_API_KEY                  server only, Studio routes   |
  |                                                               |
  |  noindex, blocked in robots.txt, Cloudflare cache bypassed    |
  +--------------------------------------------------------------+

  There is no third project. Studio lives inside the dashboard at
  /dashboard/studio, gated by D42. The deployment split exists so the
  PUBLIC site cannot reach admin tools. It was never about separating
  two authenticated admin surfaces that share a database and a role
  system, and RLS is the real enforcement between them.

  Enforced by:
    - CI check + pre-commit hook: fails on a service role JWT in
      tracked files, or a secret shaped NEXT_PUBLIC_ variable
    - Bundle scan: fails if a secret reaches client JavaScript
    - docs/ENVIRONMENT.md lists every variable by name. Values
      live in a password manager, never in the repo
```

---

## 3. Storefront request lifecycle

Catalog pages are statically generated and revalidated by tag. **A visitor does not touch the
database.** This protects load time and the Supabase free tier at the same time, and it is why
more traffic does not quickly cost more money.

```
  VISITOR                CLOUDFLARE          VERCEL            SUPABASE
     |                        |                 |                  |
     |--- GET /product/x ---->|                 |                  |
     |                        |  cache hit?     |                  |
     |                        |------ yes ----->|                  |
     |<---- HTML from edge ---|                 |                  |
     |                        |                 |                  |
     |                    (miss)                |                  |
     |                        |--- request ---->|                  |
     |                        |                 | static page,     |
     |                        |                 | already built    |
     |                        |<--- HTML -------|  (no query)      |
     |<---- HTML -------------|                 |                  |
     |                                          |                  |
     |--- GET img.beco.co.ke/... ------> R2 (edge, egress free)    |


  REVALIDATION, when the dashboard writes:

  staff edits a price
        |
        v
  server action writes to Supabase
        |
        v
  revalidateTag('product:x') and revalidateTag('category:y')
        |
        v
  next request rebuilds that page only. Everything else stays cached.
```

Filters use query parameters and are handled client side over the already delivered set, so a
filter never triggers a rebuild. Filtered URLs canonicalise back to the base category and carry
`noindex`, per D29.

---

## 4. Quote flow, path A: web

```
  VISITOR                          STOREFRONT              DATABASE
     |                                  |                      |
     |  browses catalog                 |                      |
     |  taps "Add to quote"             |                      |
     |--------------------------------->|                      |
     |                          localStorage                   |
     |                          beco_quote_cart_v1             |
     |                          survives refresh               |
     |                                  |                      |
     |                                  |--- analytics -------->| add_to_cart
     |                                  |                      |
     |  opens /quote                    |                      |
     |--------------------------------->|                      |
     |                                  |--- analytics -------->| quote_started
     |                                  |                      |
     |  reviews items, fills contact    |                      |
     |  + project details, submits      |                      |
     |--------------------------------->|                      |
     |                                  |                      |
     |                          +-------v---------+            |
     |                          | server action   |            |
     |                          | 1. zod validate |            |
     |                          |    (authority)  |            |
     |                          | 2. rate limit   |            |
     |                          |    checked at   |            |
     |                          |    Cloudflare   |            |
     |                          +-------+---------+            |
     |                                  |                      |
     |                                  |  ONE TRANSACTION     |
     |                                  |--------------------->|
     |                                  |  next_quote_ref()    |  BEC-Q-00042
     |                                  |  insert quotes       |  status: new
     |                                  |  insert quote_items  |  created_by: null
     |                                  |  audit_log           |  assigned_to: null
     |                                  |<---------------------|
     |                                  |                      |
     |                                  |--> RESEND: new quote notification to Beco
     |                                  |--- analytics -------->| quote_submitted
     |                                  |                      |
     |<--- reference + WhatsApp link ---|                      |
     |     prefilled with BEC-Q-00042                          |
     |     and the item summary                                |
```

A web quote arrives **unowned**. `created_by` is null and `assigned_to` is null until a
salesperson claims it or an admin assigns it. Reassignment is itself an audited action.

---

## 5. Quote flow, path B: the counter

Same tables, same reference format, same document. It simply enters through a different door.
**Speed matters more than polish here. Someone is waiting.**

```
  SALESPERSON on a phone, customer standing there
     |
     |  /dashboard/quotes/new
     |  search field is autofocused, so no tap is spent reaching it
     v
  +----------------------------------------------------------+
  |  TAP BUDGET: 12 taps, 3 typed fields, for 3 products      |
  |                                                           |
  |   1  New quote                                            |
  |   2  product 1 result        <- type, tap the result      |
  |   3  qty stepper                                          |
  |   4  product 2 result                                     |
  |   5  qty stepper                                          |
  |   6  product 3 result                                     |
  |   7  qty stepper                                          |
  |   8  customer name field                                  |
  |   9  phone field                                          |
  |  10  Save                                                 |
  |  11  Generate PDF                                         |
  |  12  Send                                                 |
  |                                                           |
  |  Counted out loud on a real phone before M5 closes.       |
  |  Over 12 means the milestone does not close.              |
  +----------------------------------------------------------+
     |
     |  optionally overrides a unit price
     v
  +----------------------------------------------------------+
  |  PRICE OVERRIDE, D7                                       |
  |  Any salesperson may enter any price. No approval gate.   |
  |  list_price is stored beside unit_price on the line, so   |
  |  every discount is measurable after the fact.             |
  |  audit_log: before 25000, after 22500, by A. Wanjiru      |
  +----------------------------------------------------------+
     |
     v
  ONE TRANSACTION
     insert quotes        source: walk_in | phone
                          created_by:  this salesperson
                          assigned_to: this salesperson
     insert quote_items   product_id may be NULL, with a description
                          snapshot, so an item not yet in the catalog
                          never blocks a quote at the counter
     audit_log
     |
     v
  Generate PDF ---> documents row + audit_log
     |
     +--> email to the customer, stored address or one typed now
     +--> share over WhatsApp
     +--> print and hand over
```

---

## 6. Convergence: status lifecycle and order conversion

Both paths meet here.

```
                    +-------+
   web submission   |  new  |   no owner yet
   or counter ----->+---+---+
                        |  claimed or assigned  (audited)
                        v
                  +-----------+
                  | reviewing |
                  +-----+-----+
                        |  priced, document issued
                        v
                  +-----------+
                  |  quoted   |
                  +--+-----+--+
                     |     |
              won    |     |    lost
                     v     v
              +--------+  +--------+
              |  won   |  |  lost  |  lost_reason recorded
              +---+----+  +--------+
                  |
                  |  stamps finalized_at
                  |  ONE ACTION converts to an order
                  v
        +----------------------------------------+
        |  orders           BEC-O-00042          |
        |  order_items      prices carried over  |
        |                   UNCHANGED from the   |
        |                   quote lines          |
        |  quote_id         links back           |
        |  salesperson_id   attribution survives |
        +----------------------------------------+
                  |
                  v
        pending -> confirmed -> fulfilled
                            \-> cancelled

        payment_status: unpaid | paid   plus paid_at   (D8)
```

Line prices are stored on the line and carried across unchanged. A quote issued last week does
not silently reprice because someone edited a product today, and the order matches the document
the customer was actually sent.

Reporting answers "who handled this quote" and "what did each salesperson close" from
`created_by`, `assigned_to` and `salesperson_id`, with no side spreadsheet.

---

## 7. Fixed price order path

Payments are out of scope, so this path **terminates in an order record plus a notification**,
not in a checkout. Building it as a payment flow and stripping payment later would be
significant wasted work.

```
  product with price_display_mode = fixed
     |
     |  [ Add to order ]
     v
  cart (localStorage, same store as the quote cart)
     |
     |  [ Confirm order ]
     v
  short form: name, phone, email, pickup or delivery, address, notes
     |
     v
  server action, zod validated
     |
     v
  orders (status: pending, payment_status: unpaid, source: web)
  order_items (unit_price and list_price snapshot)
  audit_log
     |
     +--> RESEND: notification to Beco, confirmation to the customer
     +--> on screen: "Order BEC-O-00042 received. We will call you
          within 2 hours to confirm payment."
     +--> WhatsApp link prefilled with the reference
     |
     v
  Payment is arranged offline: phone, M-Pesa, bank, or at the counter.
  Staff mark payment_status paid, which stamps paid_at.

  Reports then show invoiced and collected as two separate figures,
  because the dashboard genuinely knows one and not the other.
```

POA products never enter this path. `price_display_mode` is a separate column from
`availability` precisely so a card can say "In Stock" and "POA, call for price" at once without
ambiguity.

---

## 8. Drive import pipeline

Runs many times across the build, not once. **The zip was a one time bootstrap and is retired.**

```
  GOOGLE DRIVE                 tools/drive-import              DATABASE
       |                              |                            |
       |  changes.list                |                            |
       |  with stored page token      |                            |
       |<-----------------------------|  routine run               |
       |----- what moved ------------>|                            |
       |                              |                            |
       |  full listing walk           |                            |
       |<-----------------------------|  weekly reconciliation     |
       |----- everything ------------>|  (the changes feed can     |
       |                              |   miss across long gaps)   |
       |                              |                            |
       |                       +------v---------+                  |
       |                       | classify every |                  |
       |                       | file against   |<-----------------|
       |                       | import_files   |  md5, path, id   |
       |                       +------+---------+                  |
       |                              |                            |
       |     +------------------------+------------------------+   |
       |     |          |         |          |                 |   |
       |   NEW      CHANGED     MOVED    UNCHANGED          MISSING |
       |     |          |         |          |                 |   |
       |  download   reprocess  re-resolve  skip          FLAG ONLY |
       |  process    replace    role only   (should be    never     |
       |  import     bump key   no download  nearly all)  auto-     |
       |     |          |         |                       delete    |
       +-----+----------+---------+                                 |
                        |                                           |
                        v                                           |
             +---------------------+                                |
             | ROLE RESOLUTION     |                                |
             | token SET, not order|                                |
             |                     |                                |
             | {SLAB,ON,STAND} ==  |                                |
             | {STAND,ON,SLAB} ==  |                                |
             | {STONE,ON,SLAB}     |  all resolve to on_stand       |
             |                     |                                |
             | name == folder name |  -> slab                       |
             | matches nothing     |  -> unknown, NEVER guessed     |
             +----------+----------+                                |
                        |                                           |
                        v                                           |
             +---------------------+                                |
             | MISNEST DETECTOR    |                                |
             | a folder inside a   |                                |
             | colour folder whose |                                |
             | name matches a top  |                                |
             | level sibling is    |                                |
             | reported and skipped|                                |
             |                     |                                |
             | real case: AMBER    |                                |
             | JADE contains byte  |                                |
             | identical copies of |                                |
             | CYPRUS LIGHT GREY   |                                |
             | and GALAXY BIANCO   |                                |
             +----------+----------+                                |
                        |                                           |
                        v                                           v
                  R2 derivatives              import_runs, import_issues,
                                              import_files, products,
                                              categories

  Reported at /dashboard/imports and by a daily scheduled report only run,
  so "which updates are in place" is a page someone opens, not a memory of
  a WhatsApp thread.

  Running twice must produce zero changes on the second run.
```

---

## 9. Image derivative pipeline

Sources are large. The real export peaks at **44MB** for a single slab shot, not the 18MB the
brief estimated. Getting that to a sub 60KB card image is the single biggest performance lever
in the build.

```
  _incoming/  (gitignored, never committed, never uploaded raw)
       |
       |  44MB JPEG
       v
  +--------------------------------------------------+
  |  SHARP, once, at import. Never per request.       |
  |                                                   |
  |  AVIF + WebP  at  400 / 800 / 1200 / 1600 wide    |
  |  plus a 20px blur placeholder                     |
  |  width and height recorded                        |
  +--------------------------------------------------+
       |
       v
  CLOUDFLARE R2        img.beco.co.ke
       |
       v
  products.images jsonb, carrying ROLE not a flat list:

    [{ "role": "slab" | "on_stand" | "bookmatch" |
               "application" | "unknown",
       "path": "sintered-stones-12mm/limestone-ivory/slab",
       "alt":  "Limestone Ivory sintered stone slab",
       "width": 1600, "height": 1067,
       "blur": "data:image/...", "sort": 0 }]
       |
       v
  custom next/image loader -> img.beco.co.ke

  Vercel's image optimization is NEVER invoked, so its quota is never
  spent and the images cache at the Cloudflare edge with free egress.

  Every image carries explicit dimensions, so nothing reflows as it
  loads. The hero LCP image is never animated on entry.
```

Galleries must read correctly on three images as readily as on six. Five real products have no
on stand shot at all.

---

## 10. Document generation and send

```
  staff opens a quote
       |
       |  [ Generate PDF ]
       v
  +----------------------------------------------------------+
  |  @react-pdf/renderer, Node serverless function            |
  |  No headless browser. A free tier cannot afford one.      |
  |                                                           |
  |  Reads: quote + quote_items (stored unit_price, never     |
  |         live from products), settings (VAT rate,          |
  |         validity days, bank or till details, footer)      |
  |                                                           |
  |  Renders: logo, restrained brand colour, Titillium and    |
  |           Cormorant, tabular lines, subtotal, VAT as its  |
  |           own line, total, reference, validity, contact   |
  +----------------------------------------------------------+
       |
       v
  Supabase Storage  (PDFs are backed up: once sent, they are
                     not regenerable in any meaningful sense)
       |
       v
  documents row: type, quote_id, reference_number, storage_path,
                 generated_by, sent_to, sent_at
  audit_log entry
       |
       +--> preview in the dashboard before sending
       +--> email via Resend, stored address or one typed now
       +--> share over WhatsApp
       +--> download and print
```

"Did we send them the quote, and when" is answerable from the dashboard because `documents`
records it, rather than depending on someone remembering.

**Page breaks are pinned by snapshot test on a 15 line quote**, which is the case that actually
breaks. A line item split in half across a page boundary looks worse than no PDF at all.

---

## 11. Auth and account lifecycle

**No public signup on any surface.** Accounts exist only because Brightex created them.

```
  BRIGHTEX                          USER                    DATABASE
     |                                |                         |
     |  /dashboard/users              |                         |
     |  (brightex_admin only)         |                         |
     |  create: email, role, name     |                         |
     |------------------------------------------------------->  |
     |                                |          must_change_password = true
     |                                |          is_active = true
     |                                |          audit_log
     |                                |                         |
     |--- issues initial password --->|                         |
     |    out of band                 |                         |
     |                                |                         |
     |                                |  first login            |
     |                                |------------------------>|
     |                                |                         |
     |                       +--------v---------+               |
     |                       | FORCED PASSWORD  |               |
     |                       | CHANGE           |               |
     |                       | Cannot reach any |               |
     |                       | other route until|               |
     |                       | it is done.      |               |
     |                       +--------+---------+               |
     |                                |                         |
     |                                |  must_change_password = false
     |                                |  last_login_at stamped  |
     |                                |  audit_log              |

  An issued password sitting in a WhatsApp thread forever is the weak
  point in this model, so closing it on first login is not optional.

  NO self service reset. No "forgot password" email. Brightex resets
  from /dashboard/users, which reissues and re-arms the forced change.

  DEACTIVATION is immediate and reversible:
      is_active = false  ->  session ends, login blocked
      The user is never deleted, so audit history and quote
      attribution are not orphaned.

  MFA required for admin level roles at minimum.
```

---

## 12. Authorization: two enforcement layers

**Hiding UI is not access control.** Role checks live in two places and never in the client
alone.

```
   request
      |
      v
  +----------------------------------------------------------+
  |  LAYER 1: ROUTE MIDDLEWARE                                |
  |  Is there a session? Is is_active true?                   |
  |  Does the role permit this route?                         |
  |  Is must_change_password blocking everything else?        |
  |  -> redirect or 403                                       |
  +----------------------------------------------------------+
      |
      v
  +----------------------------------------------------------+
  |  LAYER 2: POSTGRES ROW LEVEL SECURITY                     |
  |  Deny by default on every table.                          |
  |  The final authority. Enforced even if layer 1 is         |
  |  bypassed entirely, and even against a leaked anon key.   |
  +----------------------------------------------------------+
      |
      v
   data

  +----------------------------------------------------------+
  |  STUDIO ROUTES require BOTH, per D42                      |
  |                                                           |
  |    role = 'brightex_admin'                                |
  |      AND                                                  |
  |    email IN settings.brightex_allowed_emails              |
  |                                                           |
  |  An EXPLICIT ADDRESS LIST, not a domain suffix, because   |
  |  Brightex's real addresses are gmail.com and a suffix     |
  |  check would match every Gmail account in existence.      |
  |                                                           |
  |  Two independent conditions, both in Postgres. A wrongly  |
  |  escalated role still cannot reach Studio. Revoking is    |
  |  removing one row from a list.                            |
  +----------------------------------------------------------+
      |
      v
  +----------------------------------------------------------+
  |  LAYER 3: THE UI, which is NOT security                   |
  |  Role based views mean a salesperson lands on their own   |
  |  quotes and does not see staff performance or settings.   |
  |  This is a usability layer on top of enforcement, never   |
  |  the enforcement itself.                                  |
  +----------------------------------------------------------+
```

Role matrix:

```
                     anon  sales  prod_mgr  editor  beco_admin  brightex_admin
  published products  R      R       RW        R        RW           RW
  categories          R      R       RW        R        RW           RW
  quotes              C*     RW+     -         -        RW           RW
  orders              C*     RW+     -         -        RW           RW
  products (draft)    -      R       RW        R        RW           RW
  blog_posts          R**    R       R         RW       RW           RW
  users               -      -       -         -        -            RW
  audit_log           -      -       -         -        R            R
  analytics_events    C*     -       -         -        R            R

  R  read      W  write      C  create only      -  denied
  *  through rate limited server actions only
  ** published posts only
  +  reads all, writes only its own unless an admin reassigns
```

Tested in pgTAP per table, per role, proving the negative rather than only the positive.

---

## 13. Analytics and the conversion funnel

The site's job is quote submissions, WhatsApp conversations and phone calls. Not pageviews.

```
  page_view
     |
     v
  product_view
     |
     +----------------+------------------+------------------+
     |                |                  |                  |
     v                v                  v                  v
  add_to_cart    whatsapp_click      call_click        (bounce)
     |            LEAVES THE SITE    LEAVES THE SITE
     v            carries product    carries product
  quote_started   context, because   context, same
     |            analytics cannot   reason
     v            follow further
  quote_submitted
     |
     v
  [ dashboard ]  reviewing -> quoted -> won
```

Every event is written twice: to GA4 under Beco's own Google account, and to the internal
`analytics_events` table, which is what Studio reports from later and what the dashboard
conversion view reads now.

`post_read` means genuinely read, measured on scroll depth or dwell, not a page load.

The dashboard reports product view to add to cart to quote submitted rates, plus WhatsApp and
call clicks per product and per category, so Beco can see which products generate leads rather
than only which get looked at.

---

## 14. Backup and restore

An untested backup is not a backup, so the restore is part of the deliverable.

```
  NIGHTLY, GitHub Actions
     |
     v
  pg_dump -> gzip -> age encrypt
     |
     +--> Drive folder BECO BACKUPS, via the same service account
     |    as the import pipeline. 30 day rotation
     |
     +--> workflow artifact, last 7, so a restore does not depend
          on Drive being reachable

  IN SCOPE:      full database, plus generated PDFs in Supabase Storage
  OUT OF SCOPE:  product images, because re running the import
                 reproduces them exactly from Drive, which is itself
                 the backup

  ON ANY PR TOUCHING supabase/migrations:
     automatic CSV export of products, quotes, orders before the change

  RESTORE DRILL, once, before launch:
     restore into a scratch Supabase project
     boot the storefront against it
     write the real commands and the real elapsed time into RUNBOOK.md

  ROLLBACK:
     code      Vercel immutable deployments, one click
     database  forward only migrations, nightly dump as the floor

  STATED TARGETS:  recovery point 24 hours, recovery time under 1 hour.
  Said plainly, because a free tier does not have point in time recovery
  and the client should know that rather than assume it.
```

---

## 15. Announcement lifecycle

Beco runs mid year sales and clearance sales. Those reach the site without a developer.

```
  beco_admin
     |
     |  /dashboard/announcements
     |  title, body, type, CTA, starts_at, ends_at, priority
     v
  announcements row
     |
     v
  +----------------------------------------------------------+
  |  STOREFRONT, server rendered, height reserved             |
  |                                                           |
  |  now() BETWEEN starts_at AND ends_at                      |
  |  AND is_active                                            |
  |  ORDER BY priority DESC LIMIT 1                           |
  +----------------------------------------------------------+
     |
     v
  bar above the header, one line desktop, two max on mobile
     |
     +--> dismissible, remembered per visitor in localStorage
     |    a NEW announcement reappears rather than staying dismissed
     |
     +--> rendered server side with reserved height, because a bar
          that appears after paint pushes the page down, and that is
          a direct CLS failure against the performance budget

  Scheduled, so a mid year sale appears and retires on its own.
  Nobody has to remember to take it down, which is how a stale
  "SALE ENDS FRIDAY" ends up live in November.

  Sale pricing on products:
     badge            hot | new | sale | clearance | null
     compare_at_price struck through original beside the current price
```

---

## 16. Blog authoring with Gemini

Blog publishing is Brightex's job, not Beco's. It lives at `/dashboard/studio/blog`, inside
the dashboard, gated by D42. **The Gemini key is Brightex's, server side in the dashboard
project, and never reaches a browser.** The storefront has no knowledge of it.

```
  BRIGHTEX in Studio                                        SERVICES
       |
       |  title or brief, target search term,
       |  optionally related products or a category
       v
  +--------------------------------------------+
  |  server action, Studio routes only          |
  |  GEMINI_API_KEY never reaches a browser     |
  |                                             |
  |  Context sent with the prompt:              |
  |   - the house voice rules                   |
  |   - NO EM DASHES, stated explicitly         |
  |   - real product names and specs, so the    |
  |     model writes about actual stock         |
  +---------------------+-----------------------+
                        |
                        v  -----------------> GEMINI API
                        |  <----------------- draft + metadata
                        |
       +----------------v-----------------+
       |  VALIDATOR, not the prompt       |
       |  rejects: em dashes, banned      |
       |  phrases, bad heading order,     |
       |  over long meta, duplicate slug  |
       |                                  |
       |  The prompt asks. This enforces. |
       +----------------+-----------------+
                        |
                        v
       +----------------------------------+
       |  HUMAN EDIT, required            |
       |  Every product claim checked      |
       |  against products.specs, which   |
       |  is the real source of truth     |
       |  Internal links added to real    |
       |  category and product pages      |
       +----------------+-----------------+
                        |
       +----------------v-----------------+
       |  COVER IMAGE                     |
       |  upload, or provide a URL        |
       |          |                       |
       |          v                       |
       |  same Sharp pipeline as products |
       |  AVIF + WebP, 4 widths, blur     |
       |          |                       |
       |          v                       |
       |  R2. Never hotlinked, because a  |
       |  third party URL will rot        |
       |                                  |
       |  alt text REQUIRED before publish|
       +----------------+-----------------+
                        |
                        v
                  seo-checklist
                        |
                        v
  blog_posts: status draft -> published
              published_at stamped
              prompt and model stored on the row
              author is A PERSON, never "AI"
              audit_log written
                        |
                        v
              revalidateTag('blog')
              sitemap picks it up
              BlogPosting JSON-LD emitted
```

**Gemini drafts. A person publishes.** Google penalises scaled content abuse, meaning bulk
generated pages made to rank, and does not penalise AI assistance on genuinely useful content.
Two reviewed articles a month is firmly the latter, but only while the review is real.

**Timing.** The three launch articles under D28 are drafted with Gemini outside the app and
seeded through a migration, because Studio is M7 and sits after launch. The in app authoring
tool ships with Studio. The key is usable today either way.

---

## 17. Live updates on the dashboard

Three tiers, because "realtime everywhere" is the expensive wrong answer.

```
  TIER 1  REALTIME, WebSocket, two tables only
          quotes and orders
             |
             |  Supabase Realtime, RLS enforced on the stream so a
             |  salesperson receives only events for rows it could
             |  already read. Subscribing is not a way around a policy.
             v
          a new quote lands, or someone else claims one

  TIER 2  REVALIDATE ON FOCUS, everything else
          tab regains focus -> refetch
             |
             |  Covers "I came back to my desk", which in practice is
             |  most of the value, at almost no cost.
             v
          stock, products, reports, audit log

  TIER 3  EXPLICIT REFRESH, always available
          "Updated 2 minutes ago  ·  Refresh"
             |
             v
          honest about staleness, and gives control back
```

### The rule that matters most

**A new row never inserts itself into a list someone is touching.**

If a salesperson is tapping a row and a new quote pushes the list down, they open the wrong
customer's quote, in front of that customer. So realtime shows a **banner, not an insertion**:

```
  +--------------------------------------------------+
  |  3 new quotes            [ Show ]                |   <- tap to apply
  +--------------------------------------------------+
  |  BEC-Q-00041   Achieng      KES 148,000   new    |
  |  BEC-Q-00040   Otieno       KES  92,400   quoted |
```

The list changes when the user chooses. Never reorder under someone's finger.

### What each tier updates

| Surface | Tier | Why |
|---|---|---|
| Quotes list, and the unassigned queue | 1 | Two salespeople watching the same queue will otherwise both work the same lead |
| Quote detail, while open | 1 | Someone else claiming or reassigning it mid edit. Pairs with optimistic locking |
| New quote count in the nav | 1 | The 2 hour promise depends on someone noticing |
| Orders, payment status | 1 | Marked paid by a colleague at the counter |
| Stock, products | 2 | One product manager, rarely concurrent |
| Reports, audit log, imports | 2 | Snapshots and history. Live would be noise |

### Practical constraints

- **Disconnect when the tab is hidden.** A persistent socket on a phone in a showroom drains
  battery for updates nobody is looking at
- **Patch the list, never refetch it.** Naive realtime turns every change into a full reload,
  which is worse than polling
- **Reconnect with backoff**, and on reconnect do one refetch, because events during the gap
  are lost
- **Degrade silently.** If the socket fails, tier 2 and tier 3 still work. Realtime is an
  enhancement, never the only path to correct data
- Free tier allows 200 concurrent connections and 2M messages a month. With around six staff
  accounts this is not close to a limit

### Why not polling

Polling every 30 seconds across six accounts for eight hours is roughly 5,800 requests a day
against a free tier, to deliver a handful of actual changes. Realtime on two tables plus
revalidate on focus costs less and arrives faster.

---

## Where to go next

| Question | Document |
|---|---|
| Why was this decided | `docs/DECISIONS.md`, `files/BUILD-PLAN.md` |
| What are the tables | `docs/SCHEMA.md` |
| Who owns which account | `docs/OWNERSHIP.md` |
| How do I deploy, roll back, restore | `docs/RUNBOOK.md` |
| What must a page satisfy | `.claude/skills/seo-checklist` |
| What is tested where | `docs/TEST-COVERAGE.md` |
| What must be walked by hand | `docs/QA-CHECKLIST.md` |
| What happens if Brightex stops | `docs/HANDOVER.md` |
| How the ongoing engagement runs | `docs/RETAINER.md` |
| How to provision and deploy | `docs/DEPLOYMENT.md` |
| Where a credential comes from | `docs/ENVIRONMENT.md` |
| How a blog post gets written | `.claude/skills/blog-content` |
| What the product must do | `docs/PRD.md` |
| The one page version | `docs/architecture-essential.md` |
| Known weaknesses and gaps | `docs/REVIEW.md` |
