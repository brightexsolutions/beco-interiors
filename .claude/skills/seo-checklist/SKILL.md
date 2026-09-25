---
name: seo-checklist
description: What every public page must satisfy before it counts as done. Use when building or changing any storefront route.
---

# SEO checklist

SEO is built into each page as it is written, never bolted on at the end. **A page is not done
until every box here is ticked.**

## Every public page

- [ ] Server rendered or statically generated. No primary content rendered client side
- [ ] Metadata API: title, description, canonical, Open Graph, Twitter card
- [ ] `meta_title` and `meta_description` overrides respected where the record has them
- [ ] In the sitemap, or deliberately excluded with a reason
- [ ] Images through `next/image` with descriptive alt from product data, never a filename
- [ ] One `h1`, headings in order
- [ ] Lighthouse budgets met with motion live: LCP under 2.0s, CLS under 0.05, INP under 200ms

## JSON-LD by page type

| Page | Schema |
|---|---|
| Product | `Product` with offers and availability, plus `BreadcrumbList` |
| Category | `ItemList` plus `BreadcrumbList` |
| Home, About | `LocalBusiness` and `Organization` |
| Blog post | `BlogPosting` |

Validate in Google's Rich Results Test, not by eye.

## Category pages specifically

- [ ] Real copy in `categories.description`, 150 to 400 words of buying guidance. A grid alone
      does not rank
- [ ] **Zero published products means `noindex` and no sitemap entry.** Flips automatically when
      the pipeline imports into it
- [ ] **Filtered URLs canonicalise to the base category and carry `noindex`.** Without this a
      multi filter grid generates hundreds of thin duplicates, which is the most common way a
      catalog site damages itself

## Local

NAP identical on the page, in `LocalBusiness` schema, and on the Google Business Profile:
Urban Square, Shop 8 and 9, Enterprise Road, Industrial Area, Nairobi. +254 722 333 730.
Mon to Sat, 8am to 6pm. A mismatch between those three is a real ranking drag and free to fix.

## Conversion, which is the actual point

- [ ] Request a quote primary, WhatsApp secondary, call tertiary, ranked identically everywhere
- [ ] The `tel:` business line is visible, not merely findable
- [ ] Price or POA stated unambiguously, with the matching primary action
- [ ] Analytics fire: `page_view`, `product_view`, `add_to_cart`, `quote_started`,
      `quote_submitted`, `whatsapp_click`, `call_click`, with product context on the last two
