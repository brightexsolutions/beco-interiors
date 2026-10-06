# QA checklist and interaction inventory

Per CLAUDE.md rule 3, every interactive element must be proven to perform the operation it
advertises. This is where that proof lives, screen by screen.

**A button that looks right and does nothing passes every visual review, which is why it
survives.** So the columns below record HOW each control was confirmed, not that someone
thought it looked fine.

## What counts as confirmed

| The control | Confirmed when |
|---|---|
| Writes to the database | The row changed |
| Sends an email | The message arrived |
| Generates a document | The PDF rendered and a `documents` row was written |
| Navigates | The right destination loaded |
| Filters or sorts | The result set AND its count actually changed |
| Changes state | The change survived a refresh |
| Opens an external channel | WhatsApp opened prefilled, the dialler had the right number |

**Feedback, on every control that writes (D117):** while it runs the button spins and says
"Saving" or the like, when it lands a Done or Failed toast names the result, and a sheet that
saved closes. While a list reloads the filter row reads "Updating" and the rows dim. A control
that does none of this is a defect, log it against the screen's row.

## Status key

- **Test** proven by an automated test, named in `docs/TEST-COVERAGE.md`
- **Server** confirmed against a running dev server, response inspected
- **Hand** clicked by a person on a real device
- **NOT CONFIRMED** built, believed to work, never actually checked

**Nothing on this page has a Hand yet.** No screen has been walked on a real iOS or Android
device. That is the largest single gap in M4 and the milestone cannot close on it.

---

## Site chrome, on every page

| Control | What it does | Status |
|---|---|---|
| Logo | Navigates to `/` | Server, 200 |
| Header background (D82, scrim reworked D92) | Transparent with light chrome over the dark-hero pages (`/`, `/gallery`, `/about`, `/contact`); solid white with a hairline everywhere else and on scroll past 8px. The dark scrim is a separate 240px layer behind the header, eased over 7 stops down to 0, not a flat gradient confined to the header's own 80px box, so it fades into the photograph rather than cutting across it | Verified by DOM measurement on `/about`, `/contact`, `/product`: transparent bg and white logo at top, solid white bg, hairline and dark logo after scroll. Scrim visually checked live on `/` against the running dev server, twice: the first pass still showed a visible edge where the fade ended, the eased 7 stop version fixed it. **Not walked on a device** |
| Nav: Shop, Projects, About, Contact | Navigate | Server, each 200 |
| About dropdown | Opens on hover for a pointer, on click or Enter otherwise. Escape returns focus to the trigger, arrows walk the items, click outside dismisses | **NOT CONFIRMED** by test. Keyboard behaviour is written but has no test and has not been walked |
| Quote counter | Reads the localStorage list and navigates to `/quote` | Test, on the list. Navigation Server |
| Business line, header | Opens the dialler on `+254722333730` | Server, `tel:` href correct. Dialler itself **NOT CONFIRMED** |
| Business line, header, number text at intermediate widths (D97) | Icon shows from `md`, the full number text only from `xl` (1280px) with `whitespace-nowrap`, rather than wrapping onto two lines around 1024 to 1280px as it did before, reported directly against a screenshot at 1200px | Server: class present in the rendered HTML. **Not walked on a device at exactly 1024 to 1280px** |
| Header right group spacing below `sm` (D98) | `gap-2`, not `gap-1`, between the phone icon, Quote button and hamburger trigger, reported directly as reading as touching around 650 to 860px | Server: class present in the rendered HTML. **Not walked on a device** |
| Mobile menu trigger | Opens the panel, traps focus, locks the page, escape returns focus to the trigger, closes on navigation | Test, 7 tests |
| Mobile action bar: Quote, WhatsApp, Call | Navigate and open external channels | Server on hrefs. **NOT CONFIRMED** that it never sits under the on screen keyboard |
| Announcement bar (D82) | Rotates through every live announcement, then "Call the showroom" (dials), then "Email us:" (`mailto:`). An announcement's own CTA navigates. Rolls up and out on a ~5.5s timer, pauses on hover, no rotation under reduced motion, no close control per D49 | Test: `buildAnnouncementItems` order, the roll, reduced-motion hold, the contact links. Server: rotates through all three items, bar stays charcoal. **Not walked on a device** |
| Launch banner (D80), when a launch date or the live switch is set | Replaces the announcement bar. Counts down to `site_launch_at`, or once live shows the reveal and links to `/gallery`. Confetti plays once per browser, `localStorage` gated, skipped under reduced motion | Test, 9 tests on `LaunchBanner`. The live transform across a page load has not been walked on a device |
| Footer nav and category links | Navigate. The products column reads live from `getCategoryTree()`, so it cannot list a duplicate or a range that does not exist: the "Lights" top level category, a loose Drive folder importing itself as its own range beside "Lighting", was merged into "Lighting" for exactly this reason. The "soon" marker on a zero stock range is gone, on direct request | Server, each 200 |
| Footer social icons | **Deliberately not links.** Five platforms drawn, all five URLs null until Beco supplies handles, so the icon is drawn without an anchor rather than shipping `href="#"` | Test |
| Footer "Terms & conditions" and "Privacy policy" (replaces the old Brightex credit, on direct request) | Navigate to `/terms` and `/privacy` | Server, each 200 |
| Skip to content | Moves focus to `#main` | **NOT CONFIRMED** |
| Every `data-analytics` call and WhatsApp link (D128) | Still dials or opens WhatsApp, and also sends `call_click` or `whatsapp_click` to GA4 (production only) and a row to `analytics_events` | Test: listener, 8 tests, default not prevented. **NOT CONFIRMED** on a deployed site: GA4 Realtime and the `analytics_events` row have not been observed, nothing has been deployed |
| Add to quote, product page and quick add (D128) | Also sends `add_to_cart` with the product slug | Test. **NOT CONFIRMED** on a deployed site |
| Send my request, on success (D128) | Also sends `quote_submitted`, with no form data | Test. **NOT CONFIRMED** on a deployed site |

---

## `/` home

| Control | What it does | Status |
|---|---|---|
| Hero CTAs | Navigate to `/shop` and `/quote` | Server |
| Hero range chips (D92) | Six ranges, not four stone colours: sintered stone, lighting, wall panels, SPC flooring, hardware, accessories, each a real link to `/shop/<range>` or a plain span if the range has no stock. Photography is a static manifest, `HERO_RANGE_IMAGES` in `lib/ranges.ts`, not a live product query, so it renders the same way before and after a `db:reset` | Test, `pinned-hero.test.tsx`, 17 tests, including the no-stock-renders-a-span case |
| Hero left column lines up with the header's own logo (D99) | Shared `HERO_GRID_INSET` (`lib/layout.ts`), corrected from the site's very first, pre-widening gutter value to match `px-24`/`px-40`, used by both `PinnedHero` and `HeroStatic` | Server: class present in the rendered HTML on both. **Not walked on a device** |
| Hero, no photography | `HeroStatic` renders in place of `PinnedHero` when `heroSlides` is somehow empty. Same eyebrow, h1, lede and the same two CTAs to the same routes, on flat charcoal. In practice this branch no longer depends on the database per D92, so it is a safety rail rather than the common case D79 wrote it for | Test, 4 tests. The swap point is `heroSlides.length` in `page.tsx` |
| Category rail cards | Navigate to the category | Server |
| Range grid cards | Navigate to the product | Server, 29 product links present |
| Room stack | Auto dealing, decorative, not interactive | n/a |
| "Beyond stone" tiles (D92) | Wall panels, SPC flooring and accessories (Lighting retired, D103), each a real link to `/shop/<range>` or a plain non-interactive block if the range has no stock, matching the hero chip rail's own rule. Added on direct feedback that scrolling past the hero still read as a stone catalogue, hardware's own cutout section and stone's three other sections aside | Server, anchors confirmed in the rendered HTML for every range with stock. Same coverage level as Range grid cards and Category rail cards above, this page's existing convention for derived display data |
| Process list | Static | n/a |
| Services grid, "Book a consultation" per card (D95) | Opens WhatsApp with that specific service named in the prefilled message, `ServiceCardGrid`, shared with `/about` | Test: `service-card-grid.test.tsx`, per-card href, new tab, axe clean. Server: 4 distinct `wa.me` hrefs present, each naming its own service |
| Cutout section, "Shop handles" | Navigates to `/shop/handles` | Server: anchor confirmed in the rendered HTML |
| Showroom film | Autoplays muted once half the frame is on screen, pauses on leaving. A phone that refuses autoplay gets a Play control on the frame, which starts the film. No autoplay under reduced motion: native controls instead | Test: `showroom-film.test.tsx`. **Not walked on a device** |

| `/?p=42`, `/?page_id=7`, `/?s=handles` (D107) | Old WordPress permalink and search shapes 301 to `/` and to `/shop?q=handles`. Campaign parameters pass through untouched | Test: `__tests__/proxy.test.ts` |
| `/product-category/handles`, `/about-us`, `/cart`, `/2024/05/post-slug` and the rest of `LEGACY_REDIRECTS` | 301 to the page that does the job now | Test: `lib/__tests__/legacy-redirects.test.ts` holds every destination to a real route. **Not yet curled against a deploy** |
| `/wp-login.php`, `/feed/`, `/wp-sitemap.xml` | 410 Gone, plain text, cached a day | Test: `__tests__/proxy.test.ts` |

`<LocalBusinessSchema />` is one component on `/`, `/about` and `/contact`, with `@id`, logo,
image and the confirmed hours. The root layout carries the Search Console tag when
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` is set, a share image and `summary_large_image`.
**Server confirmed by parsing. NOT validated in Google's Rich Results Test.**

LCP image is never animated on entry, per the motion rules. **Lighthouse NOT RUN.**

---

## `/shop`, the range index (D119)

| Control | What it does | Status |
|---|---|---|
| Range tiles | One per range in `RANGE_GROUPS`, each links to `/shop/<range>`; states stock and the ranges beneath, or "Being photographed" | Test: `RangeTiles` (order, hrefs, loose folders excluded, sublines, axe). Server: each tile 200 |
| Search form | Plain GET form, no script needed, lands on `/shop/all?q=` | Server: submitting lands on the flat list with the term |
| "See everything" | Links to `/shop/all` | Server: 200 |
| Featured rail "See everything" | Links to `/shop/all` | Server: 200 |
| "Being photographed" links | Navigate to the empty category page | Server |
| Old addresses | `/shop?range=x` and `/shop?category=y` redirect to `/shop/x`, `/shop?q=` `?finish=` `?sort=` to `/shop/all` with the same query, bare `/shop` renders | Test: `legacyShopRedirect`. Server: 307 observed for each |

## `/shop/all`, the flat list (D119)

| Control | What it does | Status |
|---|---|---|
| Range chips | "All" current, each top level range a link to its page | Test: `RangeToolbar` (links, aria-current). Server |
| Search | Debounced `?q=` on this page, scroll held | Test. Server |
| Sort | `?sort=`, default dropped from the URL | Test. Server |
| Count and Clear | "N of total", Clear only once something is set, resets to the bare page | Test |
| Empty state "Show everything" | Returns to `/shop/all` | Server |

Unfiltered `/shop/all` is indexable and in the sitemap; a searched or sorted view carries
`noindex` with canonical `/shop/all`, per D29.

## `/shop/[category]`, the strip (D119)

| Control | What it does | Status |
|---|---|---|
| Range chips | On a group: "All" is this page, each child a link. On a child: siblings under the parent, "All" links to the parent, this page marked current | Test: `rangeChips`, `RangeToolbar`. Server |
| Finish chips | Only when the range has more than one finish; toggles `?finish=` on this page | Test. Server: `?finish=Polished` narrows the grid |
| Search, Sort, Count, Clear | As on `/shop/all`, scoped to this range | Test. Server |
| Empty filtered state "Show the whole range" | Returns to the bare range page | Server |

A searched, finish filtered or sorted range view carries `noindex` with canonical
`/shop/<range>`, per D29; an empty range stays `noindex` per D27. **Server confirmed on the
dev server, 4 October.**


**Featured rail coverage (D94).** Rebuilt from `RANGE_GROUPS` rather than the raw category tree,
which let two loose Drive folders ("Fluted Wall Panels", "Drawer Rails") crowd out genuinely
stocked ranges (Hinges, Office Accessories) under the old fixed 12 item cap. Server confirmed:
every one of the six ranges with any stock now appears in the rendered rail at least once;
flooring is still absent because it holds nothing published yet, not a bug.

**A real bug, found and fixed this pass, not a styling gap.** Reported directly against a
screenshot: the Range, Finish and Sort controls each rendered as their own near-empty full width
row, with the drawn chevron stranded far from the visible box. Root cause was in
`Select` (`packages/ui/src/components/field.tsx`), a shared primitive: the flex sizing classes a
caller passes (`sm:flex-1 lg:w-auto lg:flex-none` here) were applied to the inner `<select>`
element, but the element that actually sits in the bar's flex row is the wrapping span `Select`
renders around it, hardcoded `w-full` with no way for a caller to override it. Every one of
`ShopControls`' own sizing classes was therefore inert at every breakpoint. Fixed by moving the
passed `className` onto that wrapping span instead, which is a shared fix: any other caller
passing layout classes to `Select` (`grep -rn "<Select" apps/` turns up two dozen, mostly the
dashboard's own filter bars) now gets the sizing it already asked for rather than silently
losing it. `packages/ui/src/components/__tests__/field.test.tsx` carries a regression test
asserting the wrapper, not the `<select>`, receives the class. Corner radius was raised again
this pass and confirmed rather than reopened: `docs/PLAN.md` already records that a
`rounded-2xl` then `rounded-lg` pass on `button.tsx`, `field.tsx` and every card frame was tried
during the D92 session, reported "not right" twice, and deliberately reversed outright, file by
file against `git diff`, confirmed live against the running dev server. CLAUDE.md's own "Corner
radius: sharp, no exceptions" rule was rewritten at the time specifically to record that history
so a later session does not propose it again without knowing it was already tried. Asked again
directly this pass, Brown's call stayed the same: sharp `rounded-[2px]` throughout, no revival.

Also this pass: both `/shop`'s catalogue grid and `/shop/[category]`'s product grid moved onto a
full bleed `bg-neutral-50` section, reported directly as every surface on the site reading flat
white with nothing to lift a product card off the page the way `ProductCard`'s own "no border, no
shadow" principle assumes something will. Same token the home page's "Why Beco" section already
uses, not a new colour.

---

## `/shop/[category]`, both levels

| Control | What it does | Status |
|---|---|---|
| Breadcrumb links | Navigate, including the group level | Server |
| Request a quote | Navigates to `/quote` | Server |
| Visit the showroom | Navigates to `/contact` | Server |
| Advice phone number | Opens the dialler | Server on href |
| Child range cards, group pages only | Navigate to the range | Server |
| Product cards | Navigate to the product | Server |
| Quick add to quote | Writes to the list | Test |
| Cutout section, "Visit the showroom", Handles range only | Navigates to `/contact` | Server: anchor confirmed in the rendered HTML |
| "View N more" | Reveals another page of the range, 12 at a time. This is where `/shop`'s own rail's "View all" leads, so the full range still paginates rather than dumping every product at once. `ProductGrid` swapped for `ProductGridPaginated`, the same component `/shop`'s own flat filtered view already used | Server: `/shop/sintered-stone` renders 12 of 25 published stones plus "View 12 more". Test coverage is `ProductGridPaginated`'s own, reused rather than duplicated |

`ItemList` and `BreadcrumbList` JSON-LD both emitted. **Server confirmed by parsing.**
Index gating asked of the subtree: `/shop/wall-panels` noindex, `/shop/hardware` indexable.

---

## `/product/[slug]`

| Control | What it does | Status |
|---|---|---|
| Gallery | Steps through images in role order, correct on three as well as six | Test |
| Quantity stepper | Increments and decrements | Test |
| Add to quote | Writes the product AND the chosen quantity to the list | Test, asserts quantity 3 after two increments |
| "Review quote (N)" (D82, after an add) | Appears beside the button, carries the live list count, navigates to `/quote` | Test: `href="/quote"`, text `(1)` after one add |
| WhatsApp | Opens `wa.me` prefilled with the product name | Server: confirmed on two products. **The SKU half of the message has never rendered**, because no product carries a SKU, 0 of 31 |
| Call | Opens the dialler | Server on href |
| Related product cards | Navigate | Server |
| An unknown slug (D107) | 301 to `/shop?q=<words from the slug>` rather than a 404, because WooCommerce lived at `/product/<slug>` too. A former slug from `product_slugs` still 301s to the current product first | Test: `shopSearchFor` in `legacy-redirects.test.ts`; the order of the two lookups is `loadProduct` in `page.tsx` |

`Product` with a real `Offer` and `InStock`, plus `BreadcrumbList`. **Server confirmed by
parsing. NOT validated in Google's Rich Results Test.**

---

## `/quote`

**This is the product. It is tested more thoroughly than anything else, and it is also the one
screen where the automated coverage stops short of the thing that matters.**

**Redesigned 24 September 2026** on Brown's request for a better layout, easier to use on both
desktop and mobile: the form column (the one piece D92's storefront pass had not yet touched,
`docs/PLAN.md`) is now grouped into `FormSection`s (Your details, The project) plus two
fieldsets (Collection or delivery, Anything else you need), the list panel is `lg:sticky` beside
the now much longer form so it stays on screen while the reader fills it in, and its own `<ul>`
caps at `46vh` with internal scroll past that so a long list cannot grow the sticky panel taller
than the viewport. Every input carries a placeholder now, not just phone number.

| Control | What it does | Status |
|---|---|---|
| Quantity steppers per line | Change the line quantity, persisted | Test |
| Remove line | A plain Remove on each row. Removes it immediately, no `ConfirmDialog`: a single line is recoverable by adding the product again, unlike clearing the whole list | Test |
| Stepper floor (28 September) | Minus stops at one step, half a slab for slabs, one otherwise. Before, one tap too many took the line to 0 and the list dropped it silently | Test: minus disabled at the floor, Remove still deletes |
| List placement (28 September) | Desktop: the list is an order summary on the right, sticky, form on the left. Phone: the list stays first, as step one | Server: screenshots at 1440px and iPhone 13 emulation. **NOT walked on a device** |
| Three step guide | Your list, Your details, We price it. Orientation only, not a control | Test: `aria-current="step"` on Your details |
| Rejected send | Focus moves to the first field the server named, so on a phone it is scrolled into view rather than left off screen | Test: phone field focused after a mocked rejection |
| Clear list | Empties the list, behind a `ConfirmDialog` naming what will happen | Test |
| Add more materials, on the list panel | Navigates to `/shop`. New: the list previously had no way back to the catalogue except the header nav | Test, on the href |
| Name, phone, email, company, project fields | Carry their values to the server action | Test, on the labels and the `name` attributes |
| Confirmation email, when an address was given (D109) | After the quote is saved, the storefront asks the dashboard's `/api/quote-confirmation` to send it; the customer gets the branded confirmation with the reference and the item count. A relay or provider failure raises an ops alert and never changes the customer's result | Test: `lib/__tests__/quote-confirmation.test.ts`, the route test on the dashboard side, the template tests. **Not yet observed arriving in a real inbox: needs `RESEND_API_KEY` and the relay secret on a deploy** |
| Collection or delivery, now a two-card toggle rather than bare radios | Reveals the delivery address field and the delivery charge note | Test: card click reveals both, and switching back to collection hides them again |
| Installation and samples, now bordered selectable cards rather than a bare checkbox row | Reach `submit_quote` as `p_wants_installation` and `p_wants_samples` | Integration test on the action. Card selected-state itself (`border-charcoal bg-neutral-50` on check) is **NOT walked on a device** |
| Send my request | Calls `submitQuote`, mints a reference, writes the rows | Integration test against the real database, 9 tests |
| WhatsApp and Call fallbacks | Open external channels | Server on hrefs |
| Sticky list panel on scroll, `lg` and up | Stays in view beside the form as the reader scrolls past it | Server: class present. **NOT walked on a device**, and the `46vh` scrolling cap on a long list has not been checked against a real 60 item quote |

**A quote has never been submitted from the actual browser form by a person.** The server
action is proven against a real database and the form is proven to render and carry its values,
but the two have never been joined by a human hand. That is the single most important item
outstanding on this checklist.

---

## `/gallery`

| Control | What it does | Status |
|---|---|---|
| Each photograph | Navigates to its product | Server, 61 product links |
| Project type filter, Residential / Commercial / All | Rewrites `?type=`, server re-filters, filtered view canonicalises to `/gallery` and carries `noindex` per D29 | **Renders only once a photo carries a `project_type`.** Zero do today, so the control is currently absent by design. Facet logic is tested, `projectTypeFacets`, 4 tests |
| "Delivered for" client cards | Static credential strip from the `clients` table | **Renders only once a client row is both published and permitted.** None are, so the section is currently absent. `ClientShowcase`, 5 tests |
| Request a quote, Visit the showroom | Navigate | Server |

Motion: frame drawn first, photograph wipes up into it, caption plate rises after. All inside
`prefers-reduced-motion: no-preference`. **Reduced motion NOT TOGGLED AND LOOKED AT.**

---

## `/about`, `/contact`

| Control | What it does | Status |
|---|---|---|
| Contact channel cards: quote, WhatsApp, call | Navigate and open external channels | Server on hrefs |
| Directions | Opens Google Maps at the showroom | Server on href |
| Email link | Opens the mail client | Server on href |
| Showroom film | Autoplays muted once half the frame is on screen, pauses on leaving. A phone that refuses autoplay gets a Play control on the frame, which starts the film. No autoplay under reduced motion: native controls instead | Test: `showroom-film.test.tsx`. **Not walked on a device** |
| Services grid, "Book a consultation" per card, `/about` only (D95) | Opens WhatsApp with that specific service named in the prefilled message, same `ServiceCardGrid` `/` uses | Test: `service-card-grid.test.tsx`. Server: 4 distinct `wa.me` hrefs present |
| Rotating statement, SHOWROOMS frame (D95) | Now Beco's own real showroom, `/video/showroom-poster.jpg`, in place of a stock photo of a home decor shelf that had nothing to do with an interior materials showroom | Server: path present in the rendered HTML. **Not walked on a device** |

NAP matches the footer and the JSON-LD character for character. **Server confirmed.**

---

## `/team`

| Control | What it does | Status |
|---|---|---|
| Call the business line | Opens the dialler | Server on href |
| Visit the showroom | Navigates | Server |
| Per agent call and WhatsApp | Open external channels | Rendered once a sales row is `is_public` with a phone. Photograph comes from dashboard `/users` upload |

Renders the empty state and carries `noindex`, and is absent from the sitemap, under the same
gate as an empty category. **Server confirmed.**

---

## `/404` and `/500`

| Control | What it does | Status |
|---|---|---|
| 404: Browse the range | Navigates to `/shop` | Server |
| 404: Call | Opens the dialler | Server on href |
| 500: Try again | Calls `reset()`, genuinely re-renders the segment | **NOT CONFIRMED**, no error has been forced |
| 500: WhatsApp, Back to the range | Open the channel, navigate | **NOT CONFIRMED** |
| Global error: Reload the site | Calls `reset()` | **NOT CONFIRMED** |

---

## Dashboard

The dashboard is `noindex` and robots-blocked; the site-chrome rows above do not apply. **Item
one at milestone close is the 12-tap count on `/quotes/new`, written down after counting on a
real phone** (M5 section D).

### `/login`

| Control | What it does | Status |
|---|---|---|
| Email + password fields | Uncontrolled, read from FormData by the `signIn` action | `SignInForm` tested. `signInSchema` unit tested. Heading is `PageHeading` "Sign in", Cormorant, no "Welcome back" |
| Show / hide password | `PasswordInput` flips the field between `password` and `text` | **Server** confirmed on the running dev server: the value showed and hid, mouse and keyboard. `PasswordInput` tested, 6 tests |
| Sign in | `signInWithPassword`, then `resolveSessionUser`; an inactive or unknown account is signed straight back out with the same message; a valid one calls `record_sign_in` and redirects to `next` or `/` | **Server** confirmed: signed in as each seeded role against local GoTrue, `last_login_at` moved, `login` audit row written, landed per role. Burst limit (D81) unit tested |
| Denied notice (`?denied=1`) | `Notice` alert, does not auto-forward, so no redirect loop | **Server** confirmed: a deactivated account lands here with cleared cookies |

### `/change-password`

| Control | What it does | Status |
|---|---|---|
| New + confirm password | Validated by `changePasswordSchema` (10-char floor, must match) | `ChangePasswordForm` tested, 4 tests. Schema unit tested, 4 tests |
| Show / hide password | `PasswordInput` on both fields | **Server** confirmed |
| Save password | `auth.updateUser({ password })`, then `complete_first_login()` clears `must_change_password`; redirects to the role's landing | **Server** confirmed: signed in flagged as `sam.odhiambo`, set a password, `must_change_password` went false, landed on `/quotes` |
| Forced-change gate | The proxy sends a flagged account here from every other route, including `/launch`, and lets it reach only this screen | **Server** confirmed for `/` and `/quotes` -> `/change-password`. `proxy.test.ts` covers the grid |

### Shell and navigation (section C, D85)

| Control | What it does | Status |
|---|---|---|
| Section nav | Desktop: the sidebar (`SideNav`). Phone: the bottom bar (`BottomNav`, D111), role-scoped via the same access map. The current section is charcoal; a nested path keeps its section highlighted | Test: `bottom-nav.test.tsx` 9 tests, `nav-items.test.ts`. Seen at iPhone 13 size as admin, sales and product manager, 3 October |
| Docked chrome | The pill header scrolls away. A breadcrumb then docks at the top on a phone and on desktop, and names the screen. Nested screens: section / page, section is a link back to the list | Tested: `ShellContext` hidden while the header intersects, docks after, no `lg:hidden`. **Walk on a phone and desktop** |
| Mobile section strip | Horizontal scroll, no hamburger, right-edge fade | **Server** confirmed at 390px: the strip scrolls, Quotes stays first. **Real-device swipe still to walk** |
| New-quote count | Warm Red badge on Quotes: undeleted quotes in status new, under RLS. Read on each server render of the layout; live push is still section L | `fetchNewQuoteCount` unit and integration tested. **Server** confirmed: 1 on the seed |
| Error and not-found screens | Inside the shell: "This screen did not load" with Try again and Go to home; "Nothing here" with links to Quotes and Home | Tested, both screens |
| Account menu | Name opens a flat panel: Change password (link) and Sign out (POST to `/sign-out`). Closes on Escape, outside click, navigation | **Server** confirmed: opened, "Sign out" returned to `/login` with the session gone. `AccountMenu` tested, 5 tests |
| Appearance | Moon / sun in the chrome. Toggles `html.dark` and stores `beco-dashboard-theme`. First visit follows the OS if nothing is stored | Test: `ThemeToggle`, `dashboard-theme` |
| `PageHeading` | Every screen opens with a Warm Red rule, eyebrow, Cormorant title, lede | **Server** confirmed on `/`, `/quotes`, `/products`. Tested, 4 tests |

### `/` home, admins (28 September)

| Control | What it does | Status |
|---|---|---|
| Focus panel | Quotes waiting on a response; Past target only when the SLA is breached. Open queue and New quote | `HomeFocus` tested; `toFocus` tested |
| Also on your plate | Needs approval, Still owed, Low stock, Unpublished products, each linking to the filtered list that clears it; rows with nothing to do are absent | `HomeFocus` tested on hrefs |
| Month tiles | Won, Quote to won (meter), Invoiced (paid share meter), Leads today (split by source), Products live. Each tile is one link to its list | `StatCard`, `toStatCards` tested. **Server** screenshots desktop and phone |
| Latest quotes | Six newest, each row opens the quote | `RecentQuotes` tested |

### Proxy and role landing

| Control | What it does | Status |
|---|---|---|
| `/` role landing | `beco_sales` -> `/quotes`, `beco_product_manager` -> `/products`, admins render the stat-card home, `beco_editor` gets the "nothing assigned yet" page | **Server** confirmed for all four with real sessions |
| Per-route role check | A role opening a path it may not reach is redirected to its own landing (`/users` is `brightex_admin` only) | **Server** confirmed: `sam` (sales) at `/users`, `/products`, `/launch` all bounced to `/quotes`; `beco_admin` at `/users` bounced to `/` |
| Deactivation mid-session | Proxy clears the `sb-*-auth-token` cookies and bounces to `/login?denied=1` | `proxy.test.ts` covers it. **Real mid-session walk still to do on device** |

### `/quotes`

| Control | What it does | Status |
|---|---|---|
| New quote | Phone: the raised tile in the bottom bar. Desktop: the charcoal button in the heading (D113). Both navigate to `/quotes/new`; the pill that floated over the table's Actions column is retired | Test: `bottom-nav.test.tsx`; the heading link is a plain anchor |
| Search | Debounced, narrows to a matching name, phone or reference | **Server** confirmed: `?search=Mutua` returned exactly that quote |
| Status / source filters | Narrow the row set via the URL. The `web` source is labelled Website. Below lg they are chip rows (owner, status, source), tap the active chip to clear | **Server** confirmed: `?status=quoted`, `?owner=unassigned` each returned the right subset and count. `QuoteFilters` tested, chips included |
| Needs approval chip | `?approval=pending`, linked from home. A removable chip says the filter is on | **Server** confirmed |
| Owner filter, per role | `beco_sales` gets Mine / I'm preparing / Unassigned; admins additionally get Everyone | **Server** confirmed for both a sales and an admin session |
| Row / card "View" | Navigates to the real quote detail. Desktop: underlined quote number plus a View control in the last column. Phone: the card itself is the View link | `QuoteResults` tested |
| Pagination | Previous / Next. Eight quotes a page. Page lives in `?page=`. Hidden when everything fits on one page. Changing a filter returns to page 1 | `QuoteResults` and `QuoteFilters` tested |
| Needs approval / Expired badges | Show exactly when `requires_approval` and `isExpired()` say so | **Server** confirmed against the seeded discounted and expired fixtures |
| Empty state | Renders when a filter matches nothing | **Server** confirmed: `?search=nonexistentxyz` |

### `/quotes/new`

| Control | What it does | Status |
|---|---|---|
| Add from catalogue | Opens a dialog of published products across every range. Range select beside the search lists only ranges with products. Search is focused, tick several, then Add | `NewQuoteForm` and `CataloguePicker` tested |
| Custom item | Adds a named custom line, not an empty catalogue row | Tested |
| Qty / unit price / Remove | Edit or drop a line before save. Phone: two-row compact card, list scrolls in the panel. Desktop: columns under Item / Qty / Unit / Line | Same controls as quote detail, 44px stepper |
| Customer fields | Name and phone required, email optional, source Walk in or Phone | Written into `create_counter_quote` |
| Save quote | Disabled until there is a line, reason shown. Primary in the heading on desktop; on a phone it lives in a sticky action bar with the item count and total, which steps aside while the keyboard is open | Tested: disabled until a line, bar count and total update |
| Returning customer (28 September) | Searches earlier quotes by name, phone, email or company, merged by phone in any format. Picking one fills name, phone and email; Clear empties them | `CustomerFinder`, `searchCustomers`, `dedupeCustomers` tested. **Server** confirmed against local seed data |
| Catalogue picker ranges | One `Select` beside the search: All ranges, then each range holding products with its count, nested ranges under their parent's optgroup; empty ranges absent. Combines with search. Only the product list scrolls, controls and the Add footer stay put, so the list is reachable at 390, 820 and a laptop 800px tall (D112). Rows show the product photograph | `CataloguePicker` tested. **Server** measured |
| Keyboard | A focused field scrolls into the visible area once the keyboard settles; the picker dialog fits above the keyboard | `KeyboardAwareFocus` and `Dialog` tested in jsdom. **NOT walked on a real phone**, and it can only be proven on one |

### `/quotes/[reference]`

| Control | What it does | Status |
|---|---|---|
| Line items | Lists every line, a discount struck through against the catalogue price | **Server** confirmed on the discounted seed quote |
| Line code (D124) | A line for a coded product shows its code under the name: "Code H-301" read only, the code alone on one line beside the steppers. None for a custom line | Test: `QuoteLines`. **Server** 5 Oct: a coded hinge line showed H-301 on `/quotes/BEC-Q-00006`, the delivery line none; the PDF from View printed "Code H-301" under the item (read from the PDF text and rendered to an image) |
| Requested (D101) | Delivery, Installation and Samples flags, captured on submission and previously fetched but never rendered anywhere. Delivery and Installation carry the `attention` tone (Warm Red) since each is a real pricing gap; Samples is `muted`, informational rather than a pricing gap. Delivery address shown beneath when set. Priced by adding a custom line, `add_custom_quote_line`, the existing "Not in the catalogue" control; no new pricing mechanism was built | Data layer only: `wants_installation`/`wants_samples` added to `fetchQuote`'s select and `QuoteDetail`. **NOT WALKED**: the panel itself has no test, matching this page's own established pattern (only its interactive children are unit tested, the page is walked manually) |
| Save | One control on the Line items heading. Disabled until a qty or price changes, reason shown. Writes every dirty line through `update_quote_lines`. Unsaved + Changed mark the dirty state | `QuoteLines` tested |
| Totals / Pricing on application | Shows a real total once every line is priced, the 0.3 line otherwise | **Server** confirmed both states |
| Unknown reference | A real 404, not a broken render | **Server** confirmed |
| Claim | Claims an unassigned quote for the signed-in salesperson | `QuoteActions` tested. RPC `claim_quote` |
| Assign | Admin picks a Beco salesperson or Beco admin. Changing the select assigns immediately. No Reassign button. Brightex admin is not in the list | `QuoteActions` and `fetchAssignees` tested. RPC `assign_quote` refuses `brightex_admin` |
| Approve | Admin only, on a quote that `requires_approval`. Unlocks Quoted / Won / Lost | `QuoteActions` tested |
| Mark lost | ConfirmDialog names the quote, requires a reason, confirm verb Mark lost | `QuoteActions` tested |
| Reopen | On a lost quote the viewer can mutate. ConfirmDialog named for the quote, confirm verb Reopen. Writes `reopen_quote`, status becomes reviewing | `QuoteActions` tested. RPC `reopen_quote` |
| Re-issue | On an expired open quote. Stamps a fresh `valid_until` | `QuoteActions` tested. RPC `reissue_quote` |
| Convert to order | On a won quote with no order yet. ConfirmDialog named for the quote, confirm verb Convert to order. Lands on the new order. Already converted: View order | `QuoteActions` tested. RPC `convert_quote_to_order` |
| Dates | Raised, Reviewed, Approved, Quoted, Valid until, Won, Lost, Reopened. Only stamps that exist. Lost and Reopened survive a reopen | `QuoteDates` tested |
| Add from catalogue | Opens a dialog of published products across every range. Range select, search focused, tick several, Add writes them through `add_catalogue_quote_lines` under one lock | `QuoteLines` and `CataloguePicker` tested. RPC `add_catalogue_quote_lines` |
| Not in the catalogue | Adds a named custom line, not an empty catalogue row | `QuoteLines` tested. RPC `add_custom_quote_line` |
| View | Compact heading action, top right, labelled View with a right arrow. Writes unsaved qty/price first, then opens a dialog. Pages paint onto canvas. Zoom in, zoom out, and pinch | `QuoteDocumentPanel` tested |
| Download | Real file link `?download=1`, filename includes the quote number and client name | Tested href and Content-Disposition |
| Email | Form in the preview dialog, prefilled, submits `sendQuoteEmail` | Tested |
| WhatsApp (28 September) | Beside Download. Phone: the share sheet with the PDF attached. Desktop: saves the PDF and opens a chat prefilled to the customer. Records `sent_channel = whatsapp` on that exact stored copy (`X-Document-Path`). Cancel records nothing | `WhatsAppShare` tested (share sheet, fallback, cancel, failure); action refuses another quote's path. **NOT walked on a phone** |
| Customer: Call, WhatsApp, Email | One tap to the customer, WhatsApp prefilled with the reference, Email only when there is an address. Labels never leave their button: nowrap, never narrower than the label, the row wraps instead of squeezing | `CustomerContact` tested on hrefs and the no overflow classes. **Server** measured |
| Owner and preparer names | A salesperson now sees a colleague's name, not "Unassigned", via `staff_names()` (migration 55) | pgTAP 31, `staff-names` tested. **Server** confirmed as Sam on Ken's quote |
| Phone layout | Actions and Customer come before the line editor on a phone; the right rail on desktop | **Server** screenshots, both widths |

### `/products`

The catalogue: ranges and the products filed under them, one screen (D100, reversing D91's
separate `/categories` screen). Stock is on this screen too; `/stock` redirects here, and so
does `/categories`, an old link or bookmark from before the merge.

**Ranges panel**, `CatalogueRanges`, above the product list. Third iteration: every group and
every range is now the identical pill, same height and form, in one flat wrapping row, group
directly followed by its own ranges so adjacency carries the taxonomy (there is no longer a box
or a heading weight to do it instead). Each pill's own edit pencil is a small segment sharing the
pill's own border rather than a separate button beside it. The whole panel collapses from the
"Ranges" heading. **28 September:** on a phone it starts folded (about twenty chips filled the
whole first screen) and the heading names the active range; every product row now leads with
its first photograph, or its initials when there is none or it fails to load (`ProductThumb`,
tested):

| Control | What it does | Status |
|---|---|---|
| Ranges heading (disclosure) | Collapses or re-expands the whole panel, `aria-expanded` | Test: `CatalogueRanges` |
| Range browser (D114) | First row: the major categories, each counting its whole subtree. Open one and its ranges appear on a second row; open a range with sub ranges and a third. Every pill sets `?category=` and filters the list below. The line under the rows names the path and count, with Edit and Add range for the selection only; New category in the heading. Add range opens the sheet with the parent preselected | Test: `catalogue-ranges.test.tsx`, 11 tests; `category-create.test.tsx` for the preselected parent. Seen at three widths, 3 October |
| "All products" | Clears `?category=`. No edit segment, unlike every other pill | Test: `CatalogueRanges` |
| Draft mark | Shown on a group or range pill when it is not published | Test: `CatalogueRanges` |
| Edit (small pencil, inside the pill) | Opens a detail sheet at `?range=id`, a separate control from the pill's own click-to-filter even though it shares the pill's outline | Test: `CatalogueRanges` plus `CategoryEditor` |
| New range | Ghost button beside the "Ranges" heading. Opens `?newRange=1`. File under: Major category, or any major category or range (a range is named after its major category). Three levels is the cap, the trigger refuses a fourth | Test: `CategoryCreate`, `createCategory` action, pgTAP 34 |
| File under (editor) | Offers only homes that fit: never the range's own sub ranges, never a parent that would push its existing levels past three. Disabled, with the reason, when nothing fits | Test: `categoryParentOptions`, `CategoryEditor` |
| File under | Select of top level groups. Locked, with the reason stated, when the row already has children | Test: `CategoryEditor` |
| Save (range) | Writes name, slug, parent, description, SEO overrides, published, sort order. Busts the storefront `/shop` pages for the range, its former slug and its parent. Closes the sheet on success | Test: `updateCategory` action, integration against local Postgres. Sheet close: `category-editor.test.tsx` |
| Delete range | `ConfirmDialog` names the range. Disabled when products or child ranges are still filed under it, with the reason on its own line beneath ("Empty it first: 2 ranges filed under it.") and wired by `aria-describedby`, so the label stays two words and fits a phone. Refused server side too if reached anyway. Closes the sheet | Test: `CategoryEditor` plus `deleteCategory` action |

Page URL fields (both products and ranges) carry the hint "Old links still work", not a
"redirect" mention: the person using this screen is a product manager, not a developer.

**Product list and filters:**

| Control | What it does | Status |
|---|---|---|
| Search | Debounced, rewrites `?search=`, list re-filters | Test: `ProductFilters` |
| Availability filter | Any / In stock / Pre-order / Enquire / Out of stock | Test: writes `?availability=out` |
| Published filter | Any / Published / Draft | Test |
| Stock filter | Any / Low stock / Out of stock | Test |
| Desktop table | Name, SKU, range, availability, price or POA, stock, status, Actions. Sortable | Test: `ProductResults` |
| Product cards | Phone only. Name, SKU, range, availability, stock, price or POA, low-stock flag. The card is Edit. No horizontal scroll | Test: `ProductResults` |
| Edit | Opens a detail sheet at `?edit=slug`. One column, Save and Delete stay pinned, no sideways scroll | Test: `ProductResults` plus `ProductEditor` |
| New product | Charcoal labelled FAB, desktop and phone. Opens `?new=1` as an unpublished draft | Test: `NewProductFab`, `ProductCreate`, `createProduct` action |
| SKU | Optional supplier code on create and edit. Search already matches it. Shown on the storefront product page | Test: `createProductSchema`, `updateProduct`, `ProductCreate`, `ProductEditor`, `ProductResults` |
| Add photograph | JPEG/PNG/WebP up to 12MB, role, alt. The file goes straight to R2 under a presigned PUT with a percentage on the button, then the action reads it back, writes 400/800/1600 webp and `products.images` (D116). A failed PUT falls back to the form post under 4MB | Test: `ProductImages` (staged key sent, fallback keeps the file, error toast), `stagePhoto`, `putFile`, `createPhotoUpload`, `takeStagedUpload`, `readPhotoUpload`, `addProductImage`, `processProductPhoto`. **Server** still to confirm against a real bucket with the CORS rule |
| Remove photograph | `ConfirmDialog` names the product. Deletes the shot from storage | Test: `ProductImages` |
| Save (product) | Writes name, SKU, price, specs, SEO, availability, badge, published, sort, range, unit, stock and threshold. Busts storefront cache. Button spins and reads Saving, then a Done toast and the sheet closes (D117) | Test: `updateProduct` action, integration against local Postgres. Sheet close: `product-editor.test.tsx`, remount guard in `product-results.test.tsx`. **Server** confirmed 4 October: Saving state, "Done, Saved." toast and the close all observed on the running dev server, after fixing the `updatedAt` key that had swallowed them |
| Delete product | `ConfirmDialog` names the product. Soft delete. Quotes keep their line and price. Closes the sheet | Test: `ProductEditor` plus integration |
| `/stock` | Redirects to `/products` | Test |
| `/categories` | Redirects to `/products` | Test |

The storefront card reads `Out of stock` when `stock_quantity` is 0. Uncounted (NULL) keeps the
stored availability. **The ranges panel has not been walked on a real phone against the full
live taxonomy**, only checked against desktop screenshots through three rounds of layout
changes; how the pill row wraps at phone width, and how the collapse toggle reads there, are
both still unconfirmed.

### `/orders`

D110: as `beco_sales`, an order shows Confirm, Fulfil and Mark paid and no Cancel order; as an admin, Cancel order opens the ConfirmDialog. Test: `order-actions.test.tsx`. **Not walked on a device.**


`beco_sales` and admins. No blank New order FAB: conversion is from a won quote. Stock does not auto-decrement (D89).

| Control | What it does | Status |
|---|---|---|
| Search | Debounced, rewrites `?search=`, list re-filters by name, phone or reference | Test: `OrderFilters` |
| Status / Payment / Source | Narrow the row set via the URL. `web` is labelled Website. Below lg: owner, payment and status as chip rows | Test: `OrderFilters`, chips included |
| Owner filter, per role | Sales defaults to Assigned to me. Admins default to Everyone | Test: `OrderFilters`. Page wires the options |
| Desktop table | Order, Customer, Status, Payment, Owner, Source, Raised, Value, Actions. Actions is icon plus View | Test: `OrderResults` |
| Order cards | Phone only. The card itself is View. No horizontal scroll | Test: `OrderResults` |
| Pagination | Previous / Next. Page lives in `?page=` | Test: `OrderResults` |
| Empty state | Convert a won quote, or clear the search. No New order control | Test: `OrderResults` |
| Line items | Item / Qty / Unit / Line on desktop. Phone: name, then qty × unit and line. Catalogue strike under the name. Totals sit under Line | Test: `OrderLines` |
| Line code (D124) | "Code H-301" under the item, the code that was quoted, carried across on conversion | Test: `OrderLines`; pgTAP `38_line_codes` proves the copy. **Not walked on a converted order on a server** |
| Confirm / Fulfil | Forward status only. Writes `set_order_status` | Test: `OrderActions`. RPC pgTAP |
| Cancel order | ConfirmDialog names the order, confirm verb Cancel order | Test: `OrderActions` |
| Mark paid | ConfirmDialog names the order, confirm verb Mark paid. Stamps `paid_at`. Stock unchanged. Emails a receipt if an address exists | Test: `OrderActions`, `markOrderPaid`. RPC pgTAP |
| View receipt | After paid: heading and Actions. Opens the receipt as canvas pages. Zoom in, zoom out, and pinch. Email is a real form, Download is `?download=1`, WhatsApp shares the receipt PDF the same way the quote does | Test: `OrderDocumentPanel`, `WhatsAppShare`, PDF route 409 until paid |
| Customer: Call, WhatsApp, Email; Collection or Delivery | One tap to the customer; fulfilment reads Collection or Delivery, not the raw value | `CustomerContact` tested |
| Mark paid, receipt email failed | Says the order is paid AND that the receipt did not send, and alerts Brightex | `markOrderPaid` path; `reportSendFailure` tested |
| Quote link | Inspector ownership block links to the source quote | Rendered on detail |

### `/reports`

`beco_admin` and `brightex_admin` only. `/leaderboard` redirects here. No FAB. No sparkline tiles.

| Control | What it does | Status |
|---|---|---|
| Period | This month / Last month / Custom. Custom shows start and end date inputs. Nairobi bounds. Custom is `?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD` | Test: `ReportFilters`. RPC `report_period_bounds` |
| View PDF | Heading row, next to Period. Opens a dialog with the live sales review as canvas pages. Zoom in, zoom out, and pinch. Review chooses Overall or one salesperson. Download from the footer is `?download=1` for that same document. Not stored in `documents` | Test: `ReportFilters` (opens dialog, fetches the file, switches person, custom dates, error state), report PDF route (inline vs attachment, person 400/404, inverted custom 400). Filename `Beco overall sales review {period}.pdf` or `Beco salesperson review {name} {period}.pdf` |
| Invoiced / collected | Two compact StatCards with Won and Conversion, 2 by 2 on a phone and four across from `lg`. D8. Confirmed or fulfilled vs `payment_status = paid` | Test: `ReportResults` |
| Report views | Tabs: Sales, Products, Categories. Writes `?view=` | Test: `ReportResults`. `Tabs` in `@beco/ui` |
| Sales | Won-value bars plus leaderboard. Desktop table, phone cards | Test: `ReportResults`. RPC `salesperson_leaderboard` |
| Products / Categories | Funnel and most-viewed bars, then the conversion table. n/a when the denominator is zero | Test: `ReportResults`. RPC `conversion_report` |
| Empty states | Per view, not stacked on the page | Test: `ReportResults` |
| Sales at `/reports` | Proxy bounces to `/quotes` | `access.test.ts` |

### `/users`

`brightex_admin` only (`beco.brightex.dev@gmail.com`). D38 lookup: reduced-column table plus a detail sheet, not quote-style cards. Product manager cannot load this route.

| Control | What it does | Status |
|---|---|---|
| Search | Debounced, rewrites `?search=`, list re-filters by name or email | Test: `UserFilters` |
| Role / Status | Narrow the row set via the URL | Test: `UserFilters` |
| Desktop table | Name, Email, Role, Status, Last login, Actions. Actions is icon plus View | Test: `UserResults` |
| Phone table | Name, Status, Actions. No cards. No horizontal scroll | Test: `UserResults` |
| View | Opens the detail sheet at `?user=id` | Test: `UserResults` |
| New user | Charcoal labelled FAB, desktop and phone. Opens `?new=1` | Test: `NewUserFab`, `UserCreate` |
| Create user | Email, name, role. Issues a password once, copyable. Forced change on first sign in | Test: `UserCreate`, `createStaffUser` |
| Change role | ConfirmDialog names the person. Hidden on your own row | Test: `UserEditor`. Trigger `guard_users_staff` |
| Deactivate / Reactivate | ConfirmDialog names the person. Sessions end. Quotes keep attribution. Nothing is deleted | Test: `UserEditor`, `setStaffActive` |
| Reset password | ConfirmDialog. Shows a new secret once. Re-arms `must_change_password` | Test: `resetStaffPassword` |
| Show on /team | Sales only. Writes `is_public`. Directors cannot be listed | Test: `UserEditor`, `saveStaffPublicProfile`. Constraint `users_only_sales_are_public` |
| Upload / replace photograph | JPEG, PNG or WebP up to 12MB, direct to R2 with a percentage on the button (D116). 400/800/1600 webp on R2. Preview loads from dashboard `/api/img`. Busts storefront `/team` | Test: `UserEditor`, `uploadStaffPhoto`, `readPhotoUpload`, img route |
| Remove photograph | ConfirmDialog names the person. Deletes the R2 objects | Test: `UserEditor`, `removeStaffPhoto` |
| Product manager at `/users` | Proxy bounces to `/products` | `access.test.ts`. **Server** still to walk as Aisha |

### `/announcements`

`beco_admin` (`irene.kariuki@beco.co.ke`) and `brightex_admin`. Storefront bar already exists.

| Control | What it does | Status |
|---|---|---|
| On the site now | The live bar as a visitor sees it, highest priority first, or "Nothing is live" | `AnnouncementPreview` tested. **Server** screenshot |
| Search / Type / Window | URL filters. One row from `lg` | Test: `AnnouncementFilters` |
| Desktop table | Title, Type, Dates, Priority, Status, Actions. Actions is icon plus Edit | Test: `AnnouncementResults` |
| Cards | Phone only. The card is Edit | Test: `AnnouncementResults` |
| New announcement | Charcoal labelled FAB | Test: `NewAnnouncementFab` |
| Editor | FormSections for copy, schedule (Nairobi), CTA, preview. Save writes the row and busts the storefront layout | Test: `AnnouncementEditor`, create/update actions |
| Live window | A row that starts tomorrow is absent from anon today, present once the window includes now | pgTAP `27_announcements_admin`. Integration against local Postgres |

### Dashboard shell, 3 October (D106)

| Control | What it does | Status |
|---|---|---|
| Sidebar (desktop) | Sections grouped by job; the current one filled charcoal with a red tick; Quotes carries the new count; Overview first for admins, absent for sales. Hidden under `lg` | Test: `AppShell`, `SideNav` via shell tests, `navGroupsFor`. Seen at 1440px |
| Top bar crumb (desktop) | Section, then page, the section a link back to its list | Test: `AppShell`. Seen on Overview, Quotes, Catalogue, Reports |
| Phone header | The D85 card over the showroom still, now naming the screen; the docked breadcrumb is phone only | Test: `ShellContext`, `app-shell.test.tsx`. Seen at iPhone 13 size |
| Bottom bar, New quote (D111) | Navigates to `/quotes/new` | Test: `bottom-nav.test.tsx`. Seen |
| Bottom bar, More (D111) | Opens the sheet with the remaining sections, Change password and Sign out (a POST); closes on navigation | Test: `bottom-nav.test.tsx`. Seen |
| Phone overflow audit (D112) | Every screen at 390px, every role: no element's right edge leaves the viewport | Script, `overflow.cjs` against the dev server: 0 offenders on 15 screens, 3 October. Re-run after any list, filter or heading change |
| Docked save bars and floating pills above the bar (D111) | `--dock` lifts the new quote and settings save bars and every `fabClasses()` pill above the bar | Test: `app-shell.test.tsx` on the variable; `new-quote-form` and `settings-form` bar classes. **Not walked on a device** |
| Home: Quotes, week by week | Raised against won, last eight weeks, from `activity_series()`. Legend, labels on the won bars, tooltip, hidden table. "Reports" link | Test: `HomeActivity`, `TrendBars`. Seen with eight weeks of local demo rows |
| Home: Where quotes stand | One bar from new to lost with counts under it; New in Warm Red only when the response target is breached. "Open the list" link | Test: `StageBar`, `toStages`. Seen |
| Reports: Money, week by week | Invoiced against collected, last eight weeks | Test: `ReportCharts`. Seen |
| Reports: ranked bars | Won value by salesperson, funnel, most viewed, as Recharts horizontal bars with the value at the end | Test: `RankedBars`, `ReportResults`. Seen |
| List toolbars | Quotes, Orders, Catalogue: search and filters in one row above the table, the count beside them announced on change | Test: `TableToolbar` via page render. Seen |

### `/products/import`

D115: the screen, the Drive import button on the catalogue heading and the POST admit `brightex_admin` only; a product manager or Beco admin opening `/products/import` is sent to their landing. Test: `access.test.ts`, `import/__tests__/actions.test.ts`. **Not walked on a device.**


Product manager, Beco admin, Brightex admin, the same roles as `/products`. Reached from the
Catalogue heading's "Drive import" button and by URL.

| Control | What it does | Status |
|---|---|---|
| What (chips: Check only, Import, Re-encode everything) | Picks the workflow mode; the hint under the row changes with it | Test: `ImportRunner` |
| Where (chips: Staging, Production) | Picks the target database and bucket | Test: `ImportRunner` |
| Check Drive / Start import | Dispatches `drive-import.yml` through the GitHub API with exactly `mode` and `target`. A check run or anything on staging starts at once; an import or re-encode on production asks first in a `ConfirmDialog` that names the live site. One start a minute per person. The run appears under Recent runs | Test: `ImportRunner`, `startImport`, `dispatchImport`. **Dispatch against the real repository NOT YET RUN: needs `GITHUB_ACTIONS_TOKEN` on the dashboard** |
| Not connected notice | Shown with the missing variable names when the token or repository is unset; the button is disabled with the reason | Test: `ImportRunner` |
| Recent runs | Every run GitHub lists, status in words (Queued, Running, Done, Failed, Cancelled, Waiting for approval), who started it, when. "Open log" is a real link to the run on github.com, only when GitHub gave a github.com URL | Test: `ImportWorkflowRuns`, `toWorkflowRun`, `describeRun` |
| Last import | Counts from `import_runs.summary` and every `import_issues` row for that run, grouped by top Drive folder, biggest group first, each with the path and the reason the importer wrote | Test: `ImportReport`, `groupImportIssues`. RLS: pgTAP migration 8 policies |
| How Drive is read | Static guide to the four folder shapes and the price list rule | Test: `DriveShapeGuide` axe |
| Catalogue (back link) | Returns to `/products` | Component test on `BackLink` |

### `/settings`

D110: as `beco_admin` the Studio tab and the Brightex allowlist are absent and a save leaves the stored list untouched. Test: `settings/__tests__/actions.test.ts`.


`beco_admin` (`irene.kariuki@beco.co.ke`) and `brightex_admin`. No FAB. Launch date stays on `/launch`.

| Control | What it does | Status |
|---|---|---|
| Quotes / Payments / Business / Contact / Notifications / Studio | Switches the panel immediately. URL `?tab=`. Inactive fields stay in the save form but stay hidden | Test: `SettingsForm`. VAT is not visible on Payments |
| Business (28 September) | Registered name, KRA PIN (letter, nine digits, letter, uppercased), VAT number, address, business email. Printed in the From block of quotes and receipts; KRA lines only once filled | Test: form, action, schema, `quoteFromLines`; pgTAP 30. **The printed PDF has not been checked by eye with a real PIN** |
| As printed on a quote (28 September) | Payments and Business tabs. Beside the fields on desktop, below them on a phone. Redraws the From block and the How to pay box as each field is typed, from the same functions the PDF uses. Says when no PIN or no channel will print | Test: `SettingsDocumentPreview`, `SettingsForm` (typing updates it). Seen in the running dashboard, desktop and phone |
| Phone save bar (28 September) | Phone only, docked at the bottom on every tab but Permissions. "Unsaved changes" once a field changes, "All saved" after a save goes through; a refused save keeps both the note and every typed value. Steps aside while the keyboard is open. The title row Save is desktop only | Test: `SettingsForm`. Seen at iPhone 13 size. **Keyboard behaviour NOT WALKED on a real phone** |
| Save settings | Title row, right. Writes VAT, validity, SLA, bank, till, paybill, send money, terms, footer, WhatsApp, phone, recipients, Brightex allowlist | Test: `SettingsForm`, `saveDashboardSettings`. Integration against local Postgres |
| Anniversary launch | Title row, right. Brightex only. Navigates to `/launch` | Test: `SettingsForm`. Irene does not see it |
| Allow audit / Remove audit | Brightex only. ConfirmDialog names the person. Sets `can_read_audit` | Test: `SettingsGrants`. pgTAP `28` |
| Product manager or sales at `/settings` | Proxy bounces | `access.test.ts`, `proxy.test.ts` |

### `/studio/blog`

Brightex only. Irene, sales, and a `can_write_blog` flag cannot load it.

| Control | What it does | Status |
|---|---|---|
| Search / Status | URL filters. One row from `lg` | Test: `BlogFilters` |
| Desktop table | Title, Status, Search term, Updated, Actions. Actions is icon plus Edit | Test: `BlogResults` |
| Cards | Phone only. The card is Edit | Test: `BlogResults` |
| New article | Charcoal labelled FAB to `/studio/blog/new` | Test: `NewBlogFab` |
| Generate | Sparkles icon plus Generate. Server-side Gemini. Validator rejects em dashes and banned phrases | Test: `BlogEditor`, `generateBlogDraft` |
| Body formatting | Bold, italic, heading, list, link. Link opens a Dialog, never `window.prompt`. Wraps the current selection | Test: `BlogBodyEditor` |
| Preview | Live article layout: title, byline, cover, markdown body | Test: `BlogEditor` |
| Breadcrumb | Article title, never the uuid. New article on `/studio/blog/new` | Test: `navContext`, `ShellContext` |
| Save draft | Title-row submit, `form="blog-save"`. Writes `blog_posts` | Test: `BlogEditor`, `saveBlogPost` |
| Publish / Unpublish | ConfirmDialog with the verb. Publish needs cover plus alt. Busts `/blog` | Test: `BlogEditor`, save action |
| Upload / Remove cover | Same Sharp pipeline as products. Remove uses ConfirmDialog | Test: upload refused without R2 in action tests |

### `/audit`

Brightex by default. A granted user (`can_read_audit`) can also load it. Irene cannot unless granted. No FAB.

| Control | What it does | Status |
|---|---|---|
| Search / Entity / Action | URL filters. One row from `lg` | Test: `AuditFilters` |
| Desktop table | When, Who, Action, Entity, Actions. Actions is icon plus View | Test: `AuditResults` |
| Cards | Phone only. The card is View | Test: `AuditResults` |
| View | Sheet with labelled before / after rows, not JSON. Close uses the x icon | Test: `AuditResults`, `formatAuditFields` |

### `/launch` (D80)

| Control | What it does | Status |
|---|---|---|
| `/launch` guard | `requirePath('/launch')` plus the proxy. Brightex only. Irene is bounced | RLS still `settings_write_admin`. Proxy `beco_admin` at `/launch` -> `/` |
| Save date | Writes `site_launch_at`, empty clears it | `launchSettingsSchema` unit tested, RLS pgTAP tested. The row write **NOT CONFIRMED end to end** |
| Launch the site / Revert | Flips `site_launch_live` behind a `ConfirmDialog` with the verb on its button | `LaunchControls` tested, 6 tests. The row write **NOT CONFIRMED end to end** |

### Still to walk on a real device

- [ ] Sign in on a phone, hit the forced change, set a password, land on the role's home
- [ ] A colleague deactivating your account while you are on a page: next tap bounces you out
- [ ] The auth panel video: it plays, the charcoal wash keeps the type legible on the darkest
      frame, and `prefers-reduced-motion` drops it to the still

---

## Before the milestone closes

- [ ] Walk every screen above on a real iPhone
- [ ] Walk every screen above on a real Android
- [ ] Submit a real quote from the browser form and confirm the row, the items and the reference
- [ ] Toggle reduced motion and look at every animated section
- [ ] Force an error and confirm both error pages, including that Try again works
- [ ] Run Lighthouse with the choreography live: LCP under 2.0s, CLS under 0.05, home under
      1.0MB, product under 1.2MB
- [ ] Validate every JSON-LD block in Google's Rich Results Test
- [ ] Confirm the mobile action bar never sits under the on screen keyboard
- [ ] Tab through the About dropdown and the mobile menu with a keyboard only
