# Sketches

The architecture and the user flows, drawn. Mermaid, so GitHub renders them; `docs/ARCHITECTURE.md`
keeps the ASCII versions that read in a terminal and diff line by line, and goes a level deeper on
each. `docs/SYSTEM.md` is the prose record these sketches belong to.

## 1. The system

```mermaid
flowchart TB
  buyer([A buyer]) --> sf[www.beco.co.ke<br/>Storefront, Next.js<br/>anon key, RLS]
  staff([Beco staff]) --> db[dashboard.beco.co.ke<br/>Dashboard, Next.js<br/>Supabase Auth, RLS]
  brightex([Brightex]) --> studio["/studio/*<br/>role AND allowlist"]
  studio -. inside .- db

  sf --> cf{{Cloudflare, Beco's zone<br/>DNS, WAF, rate limit}}
  db --> cf
  cf --> sb[(Supabase Postgres<br/>Auth, RLS, pgTAP)]
  cf --> r2[(Cloudflare R2<br/>img.beco.co.ke)]

  db -- "POST /api/revalidate, shared secret" --> sf
  sf -- "POST /api/ops-alert, shared secret" --> db
  db --> resend[Resend<br/>quotes, receipts, alerts]
  db --> gemini[Gemini<br/>blog drafts]
  db -- "workflow_dispatch" --> gha[GitHub Actions<br/>drive-import.yml]
  gha --> drive[(Google Drive<br/>BECO PRODUCTS)]
  gha --> sb
  gha --> r2
  cron[cron-job.org<br/>Beco's account] -- "GET /api/health" --> sf
  cron -- "GET /api/health" --> db
  cron -- "GET REST, anon key" --> sb
```

Drive is the source of truth for photography; the database for everything else. Photographs are
regenerable, so R2 is not a data ownership question the way Postgres is.

## 2. The repository

```mermaid
flowchart LR
  subgraph apps
    storefront
    dashboard
  end
  subgraph packages
    ui["@beco/ui<br/>tokens, primitives, charts"]
    documents["@beco/documents<br/>PDF, email, send"]
    validation["@beco/validation<br/>zod, limiter, bearer"]
    client["@beco/supabase-client"]
    types["@beco/types"]
  end
  subgraph tools
    import["drive-import"]
    backup["backup: verify, secret scan"]
  end
  storefront --> ui & validation & client & types
  dashboard --> ui & documents & validation & client & types
  documents --> types
  import --> client & types
```

## 3. From a commit to production

```mermaid
flowchart LR
  feat["feature branch<br/>catalogue/..., security/..."] -- "merge --no-ff" --> dev
  dev --> ci["ci.yml<br/>secrets, type floor, typecheck,<br/>contrast, Vitest x3, integration,<br/>pgTAP, builds, Lighthouse"]
  ci -- green --> preview["deploy-preview.yml<br/>Vercel preview, beco-staging"]
  dev -- "when Beco say so" --> main
  main --> prod["deploy-production.yml<br/>workflow_dispatch, typed confirm"]
  prod --> s1["migrate staging"] --> s2["deploy staging"] --> gate{human approves<br/>production environment}
  gate --> p1["migrate production"] --> p2["deploy production"]
```

Vercel's own Git integration is switched off. Nothing deploys unless CI passed (D44, D45).

## 4. The data, the parts that matter

```mermaid
erDiagram
  categories ||--o{ categories : "parent_id, three levels"
  categories ||--o{ products : category_id
  categories ||--o{ category_slugs : "old slugs, 301"
  products ||--o{ product_slugs : "old slugs, 301"
  products ||--o{ quote_items : product_id
  quotes ||--|{ quote_items : quote_id
  quotes ||--o| orders : "won, converted"
  orders ||--|{ order_items : order_id
  quotes ||--o{ documents : "quote PDF"
  orders ||--o{ documents : "receipt PDF"
  users ||--o{ quotes : assigned_to
  users ||--o{ documents : generated_by
  users ||--o{ audit_log : actor
  import_runs ||--o{ import_issues : run_id

  categories {
    uuid id
    uuid parent_id
    text slug
    text source_path "Drive folder"
    int sort_order
    bool is_published
  }
  products {
    uuid id
    text slug
    text sku "handle code"
    numeric price "null when POA"
    price_display_mode price_display_mode
    numeric stock_quantity "half slabs allowed"
    jsonb images "roles: slab, on_stand, bookmatch, application"
    timestamptz deleted_at
  }
  quotes {
    uuid id
    text reference "BQ-0001, from a sequence"
    quote_status status "new reviewing quoted won lost"
    quote_source source "web walk_in phone whatsapp"
    text customer_name
    text customer_phone
    uuid assigned_to
    numeric total_amount
    timestamptz finalized_at
  }
  orders {
    uuid id
    text reference
    order_status status "pending confirmed fulfilled cancelled"
    payment_status payment_status "unpaid paid"
    timestamptz paid_at
  }
  users {
    uuid id
    text email
    user_role role "sales, product_manager, editor, beco_admin, brightex_admin"
    bool is_active
    bool must_change_password
  }
```

Soft delete on everything commercial; `audit_log` written by triggers only. `docs/SCHEMA.md` has
every column and the RLS intent per table.

## 5. A quote's life

```mermaid
stateDiagram-v2
  [*] --> new : submit_quote (web) or counter create
  new --> reviewing : a salesperson claims it
  reviewing --> quoted : priced, PDF issued, email or WhatsApp sent
  quoted --> won : customer accepts
  quoted --> lost : marked lost, with a reason
  won --> [*] : converted to an order
  lost --> reviewing : reopened
  note right of quoted
    finalized_at is stamped on won and lost.
    Reports and the pipeline chart read it.
  end note
```

## 6. The web quote, path A

```mermaid
sequenceDiagram
  actor Buyer
  participant SF as Storefront
  participant PG as Postgres (RLS, RPC)
  participant DB as Dashboard
  participant RS as Resend

  Buyer->>SF: browses /shop, adds items to the list (localStorage)
  Buyer->>SF: /quote, name and phone, Request a quote
  SF->>SF: zod, rate limit 5/min per address
  SF->>PG: rpc submit_quote(items, customer)
  PG->>PG: recompute every price from products, mint BQ-reference
  PG-->>SF: reference
  SF->>RS: confirmation email, if an address was given
  SF-->>Buyer: thank you, reference, WhatsApp and call links
  Note over DB: the quote appears as "new" with a red badge
  DB->>PG: claim, price lines, mark quoted
  DB->>RS: priced quote email with the PDF attached
```

## 7. The counter quote, path B

```mermaid
sequenceDiagram
  actor S as Salesperson, on a phone
  participant DB as Dashboard
  participant PG as Postgres
  participant Doc as @beco/documents

  S->>DB: /quotes/new, search a returning customer (name, phone, email, company)
  S->>DB: search the catalogue, add lines, half slabs allowed
  DB->>PG: insert quote and lines as the signed-in user, RLS applies
  S->>DB: Issue quote
  DB->>Doc: render the quote PDF with the business identity and payment details from settings
  Doc-->>DB: bytes
  DB->>PG: documents row, quote status quoted
  S->>DB: Send on WhatsApp
  DB-->>S: wa.me opens prefilled with the reference and the PDF link
```

The target is a quote raised, priced and issued faster than writing it on paper. The QA checklist
counts the taps.

## 8. From won to paid

```mermaid
flowchart LR
  won["quote: won"] --> convert["convert_quote_to_order()"] --> pending["order: pending, unpaid"]
  pending --> confirmed --> fulfilled
  pending -- "record payment" --> paid["payment_status: paid, paid_at"]
  paid --> receipt["receipt PDF, documents row, email"]
  pending -. cancel, ConfirmDialog .-> cancelled
```

## 9. The Drive import

```mermaid
flowchart TB
  start([Dashboard: Start import, or pnpm drive:import]) --> walk["walk BECO PRODUCTS"]
  walk --> plan["plan: folder of folders = category, up to three levels<br/>folder with photos = product<br/>item folder = one product per filename<br/>docs reported, retired folders skipped"]
  plan --> classify["classify each file: new, changed, moved, unchanged, missing"]
  classify --> dl["download new and changed only"]
  dl --> sharp["derivatives: card, gallery, zoom, webp"]
  sharp --> r2[(R2)]
  plan --> cats["ensureCategories: chains parents first"]
  cats --> upsert["upsert products, merge images, keep dashboard renames"]
  upsert --> pg[(Postgres)]
  upsert --> report["import_runs, import_issues, a report on the import screen"]
```

## 10. Signing in, and what a role sees

```mermaid
flowchart TB
  login["/login"] --> auth{Supabase Auth}
  auth -- no --> login
  auth -- yes --> active{users.is_active and a role?}
  active -- no --> out["session cleared, /login?denied=1"]
  active -- yes --> mcp{must_change_password?}
  mcp -- yes --> change["/change-password, nothing else"]
  mcp -- no --> land["role landing"]
  land --> sales["beco_sales: /quotes<br/>Quotes, Orders"]
  land --> pm["beco_product_manager: /products<br/>Catalogue, import"]
  land --> admin["beco_admin: /<br/>everything above plus Announcements,<br/>Reports, Settings"]
  land --> bx["brightex_admin on the allowlist: /<br/>plus Users, Audit, Studio blog, Launch"]
```

Two layers, always: the proxy decides what a role sees, Postgres RLS decides what it can touch.
`lib/access.ts` is the one map both read.

## 11. A storefront request

```mermaid
flowchart LR
  req([request]) --> proxy{"proxy.ts<br/>old WordPress shape?"}
  proxy -- "/wp-login.php, /feed" --> gone["410 Gone, cached a day"]
  proxy -- "/?p=42, /?s=term" --> r301["301 to / or /shop?q="]
  proxy -- no --> redirects{"next.config redirects<br/>LEGACY_REDIRECTS"}
  redirects -- "/product-category/x, /about-us" --> r308["308 to the page that does the job"]
  redirects -- no --> page["ISR page, revalidate 3600<br/>tags product:slug, category:slug"]
  page --> meta["Metadata API, canonical,<br/>JSON-LD, sitemap lastModified"]
```

## 12. Keeping the free tiers awake

```mermaid
sequenceDiagram
  participant C as cron-job.org (Beco)
  participant SF as www /api/health
  participant DB as dashboard /api/health
  participant ST as beco-staging REST
  loop every few hours
    C->>SF: GET
    SF-->>C: 200 ok, database up
    C->>DB: GET
    DB-->>C: 200
    C->>ST: GET /rest/v1/settings?select=key&limit=1, anon key
    ST-->>C: 200
  end
  Note over C: a 503 from either health route is a real outage, alert on it
```
