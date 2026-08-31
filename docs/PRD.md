# Product Requirements: Beco Interiors Platform

Reference BEC-2026-004-PLAN. What the product must do and why, independent of how it is built.
Architecture is `docs/architecture-essential.md`, or `docs/ARCHITECTURE.md` in full.

---

## 1. The problem

Beco Interiors supplies premium interior materials in Nairobi: sintered stone, wall panels, SPC
flooring, kitchen and furniture hardware. Their buyers are architects, interior designers,
contractors and developers specifying a project.

**Those buyers do not buy one item. They specify several together and need a structured price
back, fast.** The current WordPress site cannot do that, so every enquiry becomes a phone call
and a manually typed quote.

Two other things are true and shape everything:

- **A large share of business happens at the counter.** Someone walks into the Urban Square
  showroom and wants a price while they are standing there
- **There is no system of record.** Quotes live in inboxes and WhatsApp threads. Nobody can
  answer "what did each salesperson close" without building a spreadsheet by hand

## 2. Who it is for

| User | What they need | Where |
|---|---|---|
| **Specifying buyer** | Browse by material, understand a product, request a price for several items at once | Storefront, mostly mobile |
| **Salesperson** | Raise and issue a priced quote for a customer standing in front of them, in under two minutes | Dashboard, on a phone |
| **Beco director** | Know what is in the pipeline, what closed, who closed it, and what came in today | Dashboard, at a glance |
| **Product manager** | Keep stock status and pricing current without a developer | Dashboard |
| **Brightex** | Publish content, watch performance, service the retainer | Studio |

## 3. What success looks like

Measured, not asserted.

| Outcome | Measure | Target |
|---|---|---|
| Quotes reach the business structured | `quotes` rows with items attached | Replaces ad hoc enquiries |
| Counter quotes get faster | Taps and time to issue a 3 item quote | Under 12 taps, under 2 minutes |
| The 2 hour promise is kept | Age of oldest unanswered quote | Visible on the dashboard, red when breached |
| Attribution works | Quotes and closed value per salesperson | Answerable without a spreadsheet |
| The site is found | Rankings for the 5 target terms against the pre migration baseline | Improving by month 3 |
| Leads are attributed | Quote submissions, WhatsApp clicks, calls, by product | All three captured |
| The site is fast | LCP, CLS, INP | Under 2.0s, 0.05, 200ms |

## 4. Functional requirements

### 4.1 Storefront

- **Browse** a catalog organised by the real Drive taxonomy. Category and product pages are
  generic and data driven, working with 24 products or zero
- **Mixed commerce, unambiguous.** Every product card states whether it is priced or POA, and
  shows the matching action. Priced items can be ordered. POA items request a quote. A buyer
  never has to work out which applies
- **Quote list** persisting across refresh, built from any mix of products
- **Submit a quote** with contact and project details, receiving a reference immediately
- **Order a priced item**, terminating in an order record and a notification. **No payment.**
  Payment is arranged offline
- **Three contact actions on every relevant surface**, ranked identically: request a quote,
  WhatsApp, call the business line
- **Announcements**, date scheduled, for sales and clearance events
- **Blog, gallery, about, contact**
- **Empty categories render a designed state**, never a broken page

### 4.2 Dashboard

- **Role based views.** What a user sees on login is determined by role, not just what they may
  click. A salesperson lands on their own work
- **Raise a quote at the counter**, on a phone, fast enough to use with a customer waiting
- **Add an item not yet in the catalog**, so a quote is never blocked by missing data
- **Set any unit price**, with every override audited against list price
- **Work a quote through** new, reviewing, quoted, won or lost, with ownership and reassignment
- **Convert a won quote to an order in one action**, carrying prices across unchanged
- **Generate and send a branded PDF**, by email, WhatsApp, or print
- **Manage products, pricing and stock status**
- **Mark an order paid**
- **See at a glance** what needs attention, what closed, and what came in
- **Manage users**, restricted to Brightex
- **Read the audit log**
- **Everything works on a phone.** This is a hard requirement, not a courtesy

### 4.3 Studio, after launch

- Draft, edit and publish blog content
- Cross platform reporting

## 5. Non functional requirements

| Requirement | Standard |
|---|---|
| **Zero training** | A salesperson who has never seen the dashboard can raise a quote without asking. If a screen needs explaining, redesign the screen |
| **Mobile** | Every surface. Action buttons never sit under the on screen keyboard |
| **Performance** | LCP under 2.0s, CLS under 0.05, INP under 200ms, enforced in CI |
| **Readability** | Nothing below 16px anywhere. Measure under 68ch. Contrast verified |
| **Security** | RLS on every table, deny by default. Role checks in database and middleware, never the client alone. No public signup |
| **Accessibility** | Keyboard navigation, focus states, verified contrast, meaningful alt text |
| **SEO** | Server rendered, structured data, clean URLs, every old URL redirected |
| **Auditability** | Every meaningful action logged with before and after state |
| **Recoverability** | Nightly backups, recovery point 24 hours, recovery time under 1 hour |
| **Copy** | Short and plain. No marketing voice in the dashboard. No em dashes anywhere |

## 6. Constraints

- **Four weeks**, KES 150,000, deposit paid
- **Free tier infrastructure**, upgrading only when traffic justifies it
- **Content arrives progressively.** One category has photography. Fifteen are empty. Nothing
  may block on a photograph
- **No product data exists**: no prices, specs or descriptions. Everything launches POA unless
  Beco supplies a price list
- **Beco owns their infrastructure.** Brightex holds the repository, the deployments and the
  Gemini key, and nothing else

## 7. Out of scope

Not built unless the plan is formally revised: online payments, automated WhatsApp intake via
Meta's API, customer accounts or wishlists, native apps, any ad tooling, appointment booking,
live chat, email marketing platforms.

## 8. Open product questions

| # | Question | Blocks |
|---|---|---|
| 1 | Will Beco supply prices and specs, or does everything stay POA? | Whether launch is a catalog or a gallery |
| 2 | Are the six director stat cards the right six? | The dashboard home screen |
| 3 | Does a quote expiring need to do anything, or is `valid_until` display only? | Quote lifecycle |
| 4 | Is stock a label, or does Beco need real quantities? | See the gap noted in `docs/REVIEW.md` |
| 5 | Should repeat customers be recognised across quotes? | Deliberately not modelled today |
