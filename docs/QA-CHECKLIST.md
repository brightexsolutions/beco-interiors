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
| Header background (D82) | Transparent with light chrome over the dark-hero pages (`/`, `/gallery`, `/about`, `/contact`); solid white with a hairline everywhere else and on scroll past 8px | Verified by DOM measurement on `/about`, `/contact`, `/product`: transparent bg and white logo at top, solid white bg, hairline and dark logo after scroll. **Not walked on a device** |
| Nav: Shop, Projects, About, Contact | Navigate | Server, each 200 |
| About dropdown | Opens on hover for a pointer, on click or Enter otherwise. Escape returns focus to the trigger, arrows walk the items, click outside dismisses | **NOT CONFIRMED** by test. Keyboard behaviour is written but has no test and has not been walked |
| Quote counter | Reads the localStorage list and navigates to `/quote` | Test, on the list. Navigation Server |
| Business line, header | Opens the dialler on `+254722333730` | Server, `tel:` href correct. Dialler itself **NOT CONFIRMED** |
| Mobile menu trigger | Opens the panel, traps focus, locks the page, escape returns focus to the trigger, closes on navigation | Test, 7 tests |
| Mobile action bar: Quote, WhatsApp, Call | Navigate and open external channels | Server on hrefs. **NOT CONFIRMED** that it never sits under the on screen keyboard |
| Announcement bar (D82) | Rotates through every live announcement, then "Call the showroom" (dials), then "Email us:" (`mailto:`). An announcement's own CTA navigates. Rolls up and out on a ~5.5s timer, pauses on hover, no rotation under reduced motion, no close control per D49 | Test: `buildAnnouncementItems` order, the roll, reduced-motion hold, the contact links. Server: rotates through all three items, bar stays charcoal. **Not walked on a device** |
| Launch banner (D80), when a launch date or the live switch is set | Replaces the announcement bar. Counts down to `site_launch_at`, or once live shows the reveal and links to `/gallery`. Confetti plays once per browser, `localStorage` gated, skipped under reduced motion | Test, 9 tests on `LaunchBanner`. The live transform across a page load has not been walked on a device |
| Footer nav and category links | Navigate | Server |
| Footer social icons | **Deliberately not links.** Five platforms drawn, all five URLs null until Beco supplies handles, so the icon is drawn without an anchor rather than shipping `href="#"` | Test |
| Skip to content | Moves focus to `#main` | **NOT CONFIRMED** |

---

## `/` home

| Control | What it does | Status |
|---|---|---|
| Hero CTAs | Navigate to `/shop` and `/quote` | Server |
| Hero, no photography | `HeroStatic` renders in place of `PinnedHero` when no product carries a slab or application shot. Same eyebrow, h1, lede and the same two CTAs to the same routes, on flat charcoal | Test, 4 tests. The swap point is `slabs.length` in `page.tsx` |
| Category rail cards | Navigate to the category | Server |
| Range grid cards | Navigate to the product | Server, 29 product links present |
| Room stack | Auto dealing, decorative, not interactive | n/a |
| Process list | Static | n/a |
| Cutout section, "Shop handles" | Navigates to `/shop/handles` | Server: anchor confirmed in the rendered HTML |

LCP image is never animated on entry, per the motion rules. **Lighthouse NOT RUN.**

---

## `/shop`

| Control | What it does | Status |
|---|---|---|
| Search box | Rewrites `?q=`, debounced at 250ms, server re-filters | Server: `?q=calc` narrows the grid |
| "Filters" button (mobile, D82) | Opens and closes the facet panel; a red badge shows how many of range, finish, sort are active | Test: `aria-expanded` and the panel toggle. Server: closed bar ~100px, panel opens with full-width controls and a "Show N results" close |
| Range select | Rewrites `?range=` for a group or `?category=` for a range, clearing the other so the two cannot disagree | Server: `?range=hardware` 6 of 30, `?category=handles` 6, `?range=sintered-stone` 24, `?range=wall-panels` 0 |
| Finish select | Rewrites `?finish=` | Server: `?finish=Polished` 4 of 30 |
| Sort select | Rewrites `?sort=` | Server: `price-desc` orders 95,000 then 85,000 then 75,000 |
| "Show N results" (mobile, D82) | Closes the facet panel, count matches the grid | Test |
| Filter chips | Each removes its own filter | Test: clearing a chip rewrites the URL without that filter |
| Clear all | Returns to bare `/shop` | **NOT CONFIRMED** by test |
| Range browse tiles | Navigate to the group page | Server, each 200 |
| Range browse child links | Navigate to the range page | Server, each 200 |
| Quick add to quote, on each card | Writes the product to the localStorage list | Test, asserts the list changed |
| Empty state "Show everything" | Returns to `/shop` | **NOT CONFIRMED** |
| "Being photographed" links | Navigate to the empty category page | Server |

Every filtered view carries `noindex` with canonical `/shop`, per D29. **Server confirmed.**

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

`Product` with a real `Offer` and `InStock`, plus `BreadcrumbList`. **Server confirmed by
parsing. NOT validated in Google's Rich Results Test.**

---

## `/quote`

**This is the product. It is tested more thoroughly than anything else, and it is also the one
screen where the automated coverage stops short of the thing that matters.**

| Control | What it does | Status |
|---|---|---|
| Quantity steppers per line | Change the line quantity, persisted | Test |
| Remove line | Removes it immediately, no `ConfirmDialog`: a single line is recoverable by adding the product again, unlike clearing the whole list | Test |
| Clear list | Empties the list, behind a `ConfirmDialog` naming what will happen | Test |
| Name, phone, email, company, project fields | Carry their values to the server action | Test, on the labels and the `name` attributes |
| Collection or delivery radios | Reveal the delivery address field and the delivery charge note | **NOT CONFIRMED** by test |
| Installation and samples checkboxes | Reach `submit_quote` as `p_wants_installation` and `p_wants_samples` | Integration test on the action |
| Send my request | Calls `submitQuote`, mints a reference, writes the rows | Integration test against the real database, 9 tests |
| WhatsApp and Call fallbacks | Open external channels | Server on hrefs |

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
| Showroom film | Autoplays muted at 50% visibility, pauses on leaving, no autoplay under reduced motion | **NOT CONFIRMED** by test or by hand |

NAP matches the footer and the JSON-LD character for character. **Server confirmed.**

---

## `/team`

| Control | What it does | Status |
|---|---|---|
| Call the business line | Opens the dialler | Server on href |
| Visit the showroom | Navigates | Server |
| Per agent call and WhatsApp | Open external channels | **NEVER RENDERED.** Nobody is flagged public, so the agent branch has no real data behind it |

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
| Section nav | Text links, role-scoped via `navItemsFor`. The current section is charcoal with a Warm Red underline; a nested path keeps its section highlighted | **Server** confirmed: signed in as each role, the nav listed exactly that role's sections, `/quotes` and `/quotes/...` both underlined Quotes. `TopNav` tested, 6 tests |
| Mobile section strip | Horizontal scroll, no hamburger, right-edge fade | **Server** confirmed at 390px: the strip scrolls, Quotes stays first. **Real-device swipe still to walk** |
| New-quote count | Warm Red badge on Quotes when positive | Styled and tested; **wired to 0** until realtime (section L / M) |
| Account menu | Name opens a flat panel: Change password (link) and Sign out (POST to `/sign-out`). Closes on Escape, outside click, navigation | **Server** confirmed: opened, "Sign out" returned to `/login` with the session gone. `AccountMenu` tested, 5 tests |
| `PageHeading` | Every screen opens with a Warm Red rule, eyebrow, Cormorant title, lede | **Server** confirmed on `/`, `/quotes`, `/products`. Tested, 4 tests |

### Proxy and role landing

| Control | What it does | Status |
|---|---|---|
| `/` role landing | `beco_sales` -> `/quotes`, `beco_product_manager` -> `/products`, admins render the stat-card home, `beco_editor` gets the "nothing assigned yet" page | **Server** confirmed for all four with real sessions |
| Per-route role check | A role opening a path it may not reach is redirected to its own landing (`/users` is `brightex_admin` only) | **Server** confirmed: `sam` (sales) at `/users`, `/products`, `/launch` all bounced to `/quotes`; `beco_admin` at `/users` bounced to `/` |
| Deactivation mid-session | Proxy clears the `sb-*-auth-token` cookies and bounces to `/login?denied=1` | `proxy.test.ts` covers it. **Real mid-session walk still to do on device** |

### `/quotes`

| Control | What it does | Status |
|---|---|---|
| New quote (FAB) | Fixed charcoal pill, bottom right. Navigates to `/quotes/new`. Stays on screen while the list scrolls | `NewQuoteFab` tested, 3 tests. `Fab` in `@beco/ui`, 5 tests |
| Search | Debounced, narrows to a matching name, phone or reference | **Server** confirmed: `?search=Mutua` returned exactly that quote |
| Status / source filters | Narrow the row set via the URL. The `web` source is labelled Website | **Server** confirmed: `?status=quoted`, `?owner=unassigned` each returned the right subset and count. `QuoteFilters` tested |
| Owner filter, per role | `beco_sales` gets Mine / I'm preparing / Unassigned; admins additionally get Everyone | **Server** confirmed for both a sales and an admin session |
| Row / card "View" | Navigates to the real quote detail. Desktop: underlined quote number plus a View control in the last column. Phone: the card itself is the View link | `QuoteResults` tested |
| Pagination | Previous / Next. Eight quotes a page. Page lives in `?page=`. Hidden when everything fits on one page. Changing a filter returns to page 1 | `QuoteResults` and `QuoteFilters` tested |
| Needs approval / Expired badges | Show exactly when `requires_approval` and `isExpired()` say so | **Server** confirmed against the seeded discounted and expired fixtures |
| Empty state | Renders when a filter matches nothing | **Server** confirmed: `?search=nonexistentxyz` |

### `/quotes/new`

| Control | What it does | Status |
|---|---|---|
| Add from catalogue | Opens a dialog of published products across every range. Range select includes empty folders. Search is focused, tick several, then Add | `NewQuoteForm` and `CataloguePicker` tested |
| Custom item | Adds a named custom line, not an empty catalogue row | Tested |
| Qty / unit price / Remove | Edit or drop a line before save. Phone: two-row compact card, list scrolls in the panel. Desktop: columns under Item / Qty / Unit / Line | Same controls as quote detail, 44px stepper |
| Customer fields | Name and phone required, email optional, source Walk in or Phone | Written into `create_counter_quote` |
| Save quote | Disabled until there is a line, reason shown. Primary in the heading on desktop, in the customer panel on a phone | Tested disabled-until-line |

### `/quotes/[reference]`

| Control | What it does | Status |
|---|---|---|
| Line items | Lists every line, a discount struck through against the catalogue price | **Server** confirmed on the discounted seed quote |
| Save | One control on the Line items heading. Disabled until a qty or price changes, reason shown. Writes every dirty line through `update_quote_lines`. Unsaved + Changed mark the dirty state | `QuoteLines` tested |
| Totals / Pricing on application | Shows a real total once every line is priced, the 0.3 line otherwise | **Server** confirmed both states |
| Unknown reference | A real 404, not a broken render | **Server** confirmed |
| Claim | Claims an unassigned quote for the signed-in salesperson | `QuoteActions` tested. RPC `claim_quote` |
| Assign | Admin picks a Beco salesperson or Beco admin. Changing the select assigns immediately. No Reassign button. Brightex admin is not in the list | `QuoteActions` and `fetchAssignees` tested. RPC `assign_quote` refuses `brightex_admin` |
| Approve | Admin only, on a quote that `requires_approval`. Unlocks Quoted / Won / Lost | `QuoteActions` tested |
| Mark lost | ConfirmDialog names the quote, requires a reason, confirm verb Mark lost | `QuoteActions` tested |
| Reopen | On a lost quote the viewer can mutate. ConfirmDialog named for the quote, confirm verb Reopen. Writes `reopen_quote`, status becomes reviewing | `QuoteActions` tested. RPC `reopen_quote` |
| Re-issue | On an expired open quote. Stamps a fresh `valid_until` | `QuoteActions` tested. RPC `reissue_quote` |
| Dates | Raised, Reviewed, Approved, Quoted, Valid until, Won, Lost, Reopened. Only stamps that exist. Lost and Reopened survive a reopen | `QuoteDates` tested |
| Add from catalogue | Opens a dialog of published products across every range. Range select, search focused, tick several, Add writes them through `add_catalogue_quote_lines` under one lock | `QuoteLines` and `CataloguePicker` tested. RPC `add_catalogue_quote_lines` |
| Not in the catalogue | Adds a named custom line, not an empty catalogue row | `QuoteLines` tested. RPC `add_custom_quote_line` |
| View | Compact heading action, top right, labelled View with a right arrow. Writes unsaved qty/price first, then opens a dialog with the live PDF | `QuoteDocumentPanel` tested |
| Download | Real file link `?download=1`, filename includes the quote number and client name | Tested href and Content-Disposition |
| Email | Form in the preview dialog, prefilled, submits `sendQuoteEmail` | Tested |
| WhatsApp | Copy in the preview: download the file to send it. `quoteWhatsAppLink` is tested but not on this panel | Helper unit tested |

### `/products`

Catalogue editor (M5 sections F and G, D89). Stock is on this screen; `/stock` redirects here.

| Control | What it does | Status |
|---|---|---|
| Search | Debounced, rewrites `?search=`, list re-filters | Test: `ProductFilters` |
| Availability filter | Any / In stock / Pre-order / Enquire / Out of stock | Test: writes `?availability=out` |
| Published filter | Any / Published / Draft | Test |
| Stock filter | Any / Low stock / Out of stock | Test |
| Desktop table | Name, availability, price or POA, stock count, low-stock flag, explicit Edit | Test: `ProductResults` |
| Mobile table | Reduced columns: name, availability, stock, Edit (D38) | Test |
| Edit | Opens a detail sheet at `?edit=slug`. One column, Save and Delete stay pinned, no sideways scroll | Test: `ProductResults` plus `ProductEditor` |
| New product | Heading button on desktop, charcoal FAB on a phone. Opens `?new=1` as an unpublished draft | Test: `NewProductButton`, `ProductCreate`, `createProduct` action |
| Add photograph | Upload JPEG/PNG/WebP, role, alt. Writes R2 derivatives and `products.images` | Test: `ProductImages`, `addProductImage`, `processProductPhoto` |
| Remove photograph | `ConfirmDialog` names the product. Deletes the shot from storage | Test: `ProductImages` |
| Save | Writes price, specs, SEO, availability, badge, published, sort, range, unit, stock and threshold. Busts storefront cache | Test: `updateProduct` action. Integration against local Postgres |
| Delete product | `ConfirmDialog` names the product. Soft delete. Quotes keep their line and price | Test: `ProductEditor` plus integration |
| `/stock` | Redirects to `/products` | Test |

The storefront card reads `Out of stock` when `stock_quantity` is 0. Uncounted (NULL) keeps the stored availability.


### `/launch` (D80)

| Control | What it does | Status |
|---|---|---|
| `/launch` guard | `requireAdmin` plus the proxy role check | RLS backstop in pgTAP `04_role_writes`. **Server** confirmed: `beco_admin` and `brightex_admin` reach it, other roles bounce |
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
