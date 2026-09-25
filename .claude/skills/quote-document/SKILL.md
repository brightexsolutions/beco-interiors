---
name: quote-document
description: How a quote or receipt renders consistently as a branded PDF and in email. Use for any work on documents, PDF layout, or email templates.
---

# Quote and receipt documents

For a walk in customer the PDF is often the only thing they take away, so it carries the brand
as much as the website does.

**A quote raised at the counter and one submitted through the site produce the same document.**
One template, one code path.

## Rendering

`@react-pdf/renderer`, in a Node serverless function. No headless browser, which a free tier
cannot afford. Layout is deterministic and unit testable, and it embeds the custom fonts.

## Every document carries

Logo, brand colours used with the same restraint as the site, Titillium and Cormorant, clean
tabular line items, subtotal, VAT as a separate line, total, reference number, validity period,
and Beco's contact details. Bank or till details and payment terms come from the `settings`
table, so Beco changes them without a deploy.

## Rules

- **Page breaks are pinned by snapshot test on a 15 line quote**, which is the case that
  actually breaks. A line item split in half across a page looks worse than no PDF at all
- Every generation and every send writes a `documents` row and an audit log entry, so "did we
  send them the quote and when" is answerable from the dashboard
- Line prices come from the stored `unit_price` on the line, never live from `products`
- Viewable in the dashboard before sending, downloadable, shareable over WhatsApp, sendable to
  the stored address or one typed at send time

## Email

React Email components, plain text fallback generated from the same source. Templates: new web
quote to Beco, quote to customer with PDF attached, order confirmation, receipt, password
issued or reset.

Short, plain, no marketing voice, no em dashes. Tested in Gmail and Outlook once per template,
because email HTML is not web HTML.
