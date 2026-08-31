# PDF rendering

`@react-pdf/renderer` in a Node serverless function. No headless browser, which a free tier
cannot afford.

**Page breaks are pinned by snapshot test on a 15 line quote**, which is the case that actually
breaks. A line item split across a page boundary looks worse than no PDF at all.

Every generation and send writes a `documents` row and an `audit_log` entry.

Line prices come from the stored `unit_price` on the line, never live from `products`.

**A quote of entirely POA items has no totals.** Print "Pricing on application" rather than
`KES 0.00`, which would read as free. See docs/REVIEW.md 2.5.
