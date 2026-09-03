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
| Nav: Shop, Projects, About, Contact | Navigate | Server, each 200 |
| About dropdown | Opens on hover for a pointer, on click or Enter otherwise. Escape returns focus to the trigger, arrows walk the items, click outside dismisses | **NOT CONFIRMED** by test. Keyboard behaviour is written but has no test and has not been walked |
| Quote counter | Reads the localStorage list and navigates to `/quote` | Test, on the list. Navigation Server |
| Business line, header | Opens the dialler on `+254722333730` | Server, `tel:` href correct. Dialler itself **NOT CONFIRMED** |
| Mobile menu trigger | Opens the panel, traps focus, locks the page, escape returns focus to the trigger, closes on navigation | Test, 7 tests |
| Mobile action bar: Quote, WhatsApp, Call | Navigate and open external channels | Server on hrefs. **NOT CONFIRMED** that it never sits under the on screen keyboard |
| Announcement bar CTA | Navigates to `/contact` | Server. No close control by design, per D49 |
| Footer nav and category links | Navigate | Server |
| Footer social icons | **Deliberately not links.** Five platforms drawn, all five URLs null until Beco supplies handles, so the icon is drawn without an anchor rather than shipping `href="#"` | Test |
| Skip to content | Moves focus to `#main` | **NOT CONFIRMED** |

---

## `/` home

| Control | What it does | Status |
|---|---|---|
| Hero CTAs | Navigate to `/shop` and `/quote` | Server |
| Category rail cards | Navigate to the category | Server |
| Range grid cards | Navigate to the product | Server, 29 product links present |
| Room stack | Auto dealing, decorative, not interactive | n/a |
| Process list | Static | n/a |

LCP image is never animated on entry, per the motion rules. **Lighthouse NOT RUN.**

---

## `/shop`

| Control | What it does | Status |
|---|---|---|
| Search box | Rewrites `?q=`, debounced at 250ms, server re-filters | Server: `?q=calc` narrows the grid |
| Range select | Rewrites `?range=` for a group or `?category=` for a range, clearing the other so the two cannot disagree | Server: `?range=hardware` 6 of 30, `?category=handles` 6, `?range=sintered-stone` 24, `?range=wall-panels` 0 |
| Finish select | Rewrites `?finish=` | Server: `?finish=Polished` 4 of 30 |
| Sort select | Rewrites `?sort=` | Server: `price-desc` orders 95,000 then 85,000 then 75,000 |
| Filter chips | Each removes its own filter | **NOT CONFIRMED** by test. The handlers call the same `set` the selects use |
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

`ItemList` and `BreadcrumbList` JSON-LD both emitted. **Server confirmed by parsing.**
Index gating asked of the subtree: `/shop/wall-panels` noindex, `/shop/hardware` indexable.

---

## `/product/[slug]`

| Control | What it does | Status |
|---|---|---|
| Gallery | Steps through images in role order, correct on three as well as six | Test |
| Quantity stepper | Increments and decrements | Test |
| Add to quote | Writes the product AND the chosen quantity to the list | Test, asserts quantity 3 after two increments |
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
| Remove line | Removes it, behind a `ConfirmDialog` | Test on the dialog |
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
