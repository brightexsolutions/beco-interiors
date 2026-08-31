# Review: what will break, what is missing, what is over engineered

A deliberate adversarial pass over the plan before any feature code exists. Several items below
are flaws in what was specified, not risks that arrived from outside.

Dated 31 August 2026, at M0.

---

## Part 1: What will break

### 1.1 Cloudflare edge cache defeats ISR revalidation

**Severity: high. This one is a genuine design flaw and it will look like a bug in production.**

The plan says catalog pages are statically generated and revalidated by tag when the dashboard
writes, and separately that Cloudflare caches HTML "respecting origin cache control".

Those two do not compose. Next.js ISR sets `s-maxage` with `stale-while-revalidate`. Cloudflare
caches that HTML at the edge. When `revalidateTag` fires, **Vercel's cache updates and
Cloudflare's does not.** A price change is live on Vercel and invisible to visitors until
Cloudflare's TTL expires.

Symptom: staff change a price, hard refresh, see the old one, conclude the dashboard is broken.

Fix, one of:

- Purge the Cloudflare cache for the affected paths as part of the revalidation server action
- Or set HTML to **bypass** Cloudflare cache and let Vercel's own CDN serve it, keeping
  Cloudflare for static assets, images, WAF and rate limiting only

**Recommend the second.** It is simpler, it has one cache instead of two, and Vercel's CDN is
already good. Cloudflare still earns its place on `/_next/static`, R2 images, WAF and the rate
limit rule.

### 1.2 The Drive changes feed may not work as specified

**Severity: high. Asserted with more confidence than it deserved.**

The plan says change detection uses `changes.list` with a stored page token. The Drive changes
feed is **scoped to a drive, not to a folder**. `BECO PRODUCTS` lives in Irene's personal My
Drive and is shared with a service account. A service account has its own empty My Drive, and
its changes feed reflects that, not the shared folder.

This may simply return nothing useful.

Fix: **make the full listing walk the primary mechanism, not the weekly backstop.** Listing 24
folders and roughly 120 files is a handful of API calls and takes seconds. Change detection
still comes from comparing `md5Checksum` against `import_files`, which is where the real work
happens and which does not depend on the changes feed at all.

Keep the changes feed as an optimisation to try later, once the catalog is large enough for
listing cost to matter. It is not close to that today.

### 1.3 The announcement bar cannot be both server rendered and localStorage dismissible

**Severity: medium. Another composition failure between two things specified separately.**

The plan says render it server side with height reserved so it costs no CLS, and separately
that dismissal is remembered in `localStorage`.

`localStorage` is client only. So the server renders the bar for someone who dismissed it, the
client removes it after hydration, the page jumps. **That is exactly the CLS the reservation
was meant to prevent.**

Fix: dismiss via a **cookie**, which the server can read, so a dismissed bar is never rendered
at all. One line different, and it actually works.

### 1.4 The 12 tap budget is probably not achievable as drawn

**Severity: medium.**

The sequence assumes the search field is autofocused and stays focused after each add. In
practice, on iOS, programmatic focus frequently does not raise the keyboard, and after adding a
product the result list usually needs dismissing before the next search. Realistically it is 15
to 18 taps.

The budget is still the right instinct. But it should be treated as a design target that forces
the flow to be good, and renegotiated **once measured on a real device**, rather than a number
the milestone fails against on day one.

Design implication worth building for deliberately: after adding an item, keep focus in the
search field and clear it, so the next product is type then tap with nothing in between.

### 1.5 M2 at 3.5 days is optimistic

**Severity: medium.**

Sharp on 44MB source files, 24 products, roughly 120 images, 8 derivatives each is close to a
thousand encode operations. AVIF encoding in particular is slow. Add the CJK filenames needing
manual resolution, the misnest detection, and first contact with a Drive API that may not
behave as assumed per 1.2.

Realistically 4.5 to 5 days. See 3.3 for a change that recovers most of it.

### 1.6 Report date boundaries will be wrong

**Severity: low, but embarrassing when noticed.**

Timestamps are `timestamptz`, correctly. But "this month" computed in UTC starts at 3am EAT.
Quotes raised between midnight and 3am land in the previous month's figures, and a director
comparing the dashboard against their own count will find it off by a few.

Fix: compute all report boundaries in `Africa/Nairobi` explicitly. Cheap now, annoying later.

### 1.7 Email deliverability on a cold domain

**Severity: low to medium.**

`beco.co.ke` has no transactional sending history. Early quote emails may land in spam, at
exactly the moment the client is judging whether the system works.

Mitigation: DMARC at `p=none` initially, which is already specified. Send the first few to
known addresses and check placement. Warn Beco to check spam for the first week rather than
letting them discover it.

### 1.8 Reduced motion versus sticky based pinning

**Severity: low.**

Pinning uses `position: sticky` inside a deliberately tall container. Disabling pinning under
`prefers-reduced-motion` without also collapsing the container height leaves a screen of empty
space. Easy to miss, because whoever builds it will not have reduced motion on.

Add it to the QA checklist, which already calls for toggling reduced motion.

---

## Part 2: Edge cases missing

### 2.1 Stock is a label, not a quantity, and one stat card assumes otherwise

**This is an internal contradiction in the plan.**

`products.availability` is an enum: `in_stock`, `pre_order`, `poa`. There is no quantity
anywhere. But the director's stat cards include "low or out of stock items", and low stock
implies a number.

Resolve one way or the other:

- **Simple:** the card counts items explicitly marked out of stock or pre order. No new schema.
  Recommended, because Beco is not asking for inventory management
- **Fuller:** add `stock_quantity` and a `low_stock_threshold`, and accept that someone must
  keep them accurate, which nobody ever does unless it is tied to actual operations

Recommend simple, and rename the card to match what it can honestly show.

### 2.2 Concurrent edits to the same quote

Two salespeople open quote 42. Both save. **Last write silently wins**, and the first person's
change is gone with no indication.

At minimum: compare `updated_at` on save and refuse with "this quote changed while you were
editing". Cheap, and it prevents a class of trust destroying bug.

### 2.3 Renaming a Drive folder silently breaks a URL

Slugs derive from folder names, which is good for traceability. But a rename produces a new
slug, so the old product URL 404s. **Given the SEO emphasis, that is a self inflicted ranking
loss**, and it will happen, because folder names are already inconsistent.

Fix: a `product_slugs` history table, or a `previous_slugs` array, with a 301 from any former
slug. Small, and it removes a whole category of future damage.

### 2.4 Quote expiry does nothing

`valid_until` is stored and printed on the PDF. Nothing acts on it. A quote sits at `quoted`
forever. Is an expired quote still honourable? Does it change status? Does the dashboard show
it differently?

Needs a product decision, not a technical one. Recorded as PRD open question 3.

### 2.5 VAT on an unpriced quote

Everything launches POA. A quote of entirely POA items has no subtotal, so what does the VAT
line say, and what does the total say? The document must handle "quote with unpriced items"
without printing `KES 0.00` as though everything were free.

Likely answer: omit the totals block and print "Pricing on application" instead. Needs
designing, not discovering during the first counter demo.

### 2.6 No customer entity

Quotes carry name, phone and email as loose columns. The same buyer quoted five times is five
unrelated rows. Reporting can never say "this customer has bought three times", and a
salesperson cannot see history for the person in front of them.

This is a reasonable simplification for a four week build, but **name it as a deliberate
choice** rather than letting it be discovered as an omission. It is also the single most likely
Phase 2 request.

### 2.7 A walk-in with no email

The counter flow ends in send by email, WhatsApp, or print. If the customer wants only a
printed copy, `documents.sent_to` and `sent_at` are null. Fine, but the schema and the UI must
not require them, and "was this sent" then has three states rather than two.

### 2.8 Deleting a product that sits in an open quote

Soft delete keeps the row, and `quote_items` holds a price and description snapshot, so the
document is safe. But the dashboard's link through to the product from a quote line will hit a
deleted record. Needs a graceful state, not a crash.

### 2.9 Reference number gaps

`nextval()` advances even when a transaction rolls back, so `BEC-Q-00041` may be followed by
`BEC-Q-00043`. Harmless technically, but a client looking at their own quote numbers may ask
where 42 went. Worth knowing the answer in advance.

### 2.10 Web orders are unauthenticated

Anyone can submit an order with any name and phone. Rate limited at Cloudflare, but not
verified. Accepted for this build, and worth stating so nobody is surprised by a junk order.

### 2.11 No draft preview for blog posts

Studio drafts a post. How does anyone see it rendered, with real styles, before publishing?
Needs a preview route gated to `brightex_admin`, otherwise the first sight of a post's real
appearance is after it is public.

---

## Part 3: What is over engineered

### 3.1 Studio as a third application, ACCEPTED and fixed

**Was the clearest case of over engineering in the plan. Resolved on 31 August 2026 as D9 and
D42.** Studio is now routes at `/dashboard/studio`, gated by role and an email allowlist. No
third project, no third domain, no third environment set. M7 drops from 4.5 days to 3.5.

Studio is a blog editor plus a reports page, for one role, used by one company. It currently
costs: a third Next.js app, a third Vercel project, a third deployment target, a third
environment variable set, a third domain, its own auth surface, and a permanent line in every
architecture diagram.

The security argument for splitting deployments is real, but it is about **the public site not
reaching admin tools**. It does not apply between two authenticated admin surfaces that share a
database and a role system.

**Recommend: Studio becomes routes inside the dashboard, gated to `brightex_admin`**, exactly
as `/dashboard/users` already is. Removes a deployment, a domain, a config set, and the awkward
conversation about why a Brightex tool lives on the client's domain. RLS already prevents any
Beco role from reaching it, and that is the actual enforcement.

Saves roughly a day of M7 and permanent operational overhead.

### 3.2 Four tables for the import pipeline

`import_runs`, `import_issues`, `import_files`, `import_state`, for a pipeline handling 24
products today and maybe 500 eventually.

`import_files` genuinely earns its place: it is what makes change detection work without
re downloading. The other three could be one `import_runs` table with a jsonb summary column.

Not urgent, but worth collapsing before it calcifies.

### 3.3 AVIF alongside WebP, at four widths

Eight derivatives per image, roughly a thousand files for one category.

**AVIF encoding is markedly slower than WebP** and is much of why M2 is underestimated. The
gain over WebP is real but modest, roughly 20 percent, and WebP support is now universal.

**Recommend: WebP only at launch, at three widths rather than four.** Halves storage, roughly
halves import time, and recovers most of the M2 overrun in 1.5. Add AVIF later as a pure
optimisation, when it is a background job rather than a critical path.

### 3.4 pgTAP as a separate testing toolchain

RLS testing is genuinely the most important layer here, so it stays. But pgTAP means learning a
second testing dialect for one job.

The same coverage is achievable in Vitest using `supabase-js` clients signed as each role,
asserting what each can and cannot reach. Same guarantees, one toolchain, and tests that anyone
on the project can read.

Worth a decision rather than defaulting to pgTAP because it is the conventional answer.

### 3.5 `compare_at_price` and sale badges before any price exists

Every product launches POA. Sale pricing is built for a state that cannot occur until Beco
supplies a price list, which may be weeks away.

The schema column is nearly free and awkward to retrofit into quote and PDF line items, so
**keep the column**. But the UI for struck through prices, sale badges and clearance styling
should wait until at least one product has a price. Building the display now is building
against an empty table.

### 3.6 The six effect scroll choreography, in four weeks

Already flagged as stageable, and it should actually be staged. It is the work most likely to
consume days and least likely to change whether Beco closes more quotes.

Pinned hero and the reveal system at launch. Category rail, scale and crop panel, and cut out
parallax the week after.

### 3.7 Announcement priority ordering

There will be at most one announcement at a time. Ordering logic for a set of one is
speculative. Keep the column, skip the UI.

### 3.8 `quote_items.line_total`

Derivable from `unit_price` times `quantity`. A stored derived value is a thing that can
disagree with its inputs. Use a generated column, or compute it.

---

## Part 4: What to actually do

In order, before M1 begins.

| # | Action | Why |
|---|---|---|
| 1 | Bypass Cloudflare cache for HTML, keep it for static, images, WAF and rate limiting | 1.1, a real production bug avoided |
| 2 | Make the full listing walk the primary import mechanism | 1.2, the specified approach may not work at all |
| 3 | Dismiss announcements by cookie, not `localStorage` | 1.3, otherwise the CLS fix does not work |
| 4 | WebP only, three widths, at launch | 3.3, recovers most of the M2 overrun |
| 5 | ~~Fold Studio into the dashboard~~ **Done, D9 and D42** | 3.1, removed a deployment and a domain |
| 6 | Add slug history and 301s from former slugs | 2.3, prevents self inflicted ranking loss |
| 7 | Optimistic locking on quote save | 2.2, prevents silent data loss |
| 8 | Report boundaries in `Africa/Nairobi` | 1.6, otherwise the figures are quietly wrong |
| 9 | Rename the stock stat card to what it can honestly show | 2.1, resolves a contradiction |
| 10 | Decide quote expiry behaviour and unpriced quote totals | 2.4 and 2.5, product decisions needed before M5 |

Items 1 to 5 are the ones that change the plan. The rest are small and can be absorbed.

**Net effect on the timeline: roughly neutral.** Items 4 and 5 give back about a day and a half
between them, which pays for items 1, 2, 3, 6 and 7.
