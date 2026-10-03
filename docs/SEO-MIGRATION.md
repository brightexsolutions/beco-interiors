# Taking the old site's place in Google

Reference D107. Written for Beco, who own the Google account, with the steps Brightex does
marked as such.

## The situation

www.beco.co.ke ran a WordPress and WooCommerce site before this one. The developer who built it
submitted it to Google and left no record of where, under which account, or which URLs it had.
Google still lists those URLs. Beco now have their own Google account, and the aim is simple:
every old address Google holds hands its standing to the page that does its job on this site, so
the new addresses are what rank, and nobody has to find the old account to make that happen.

Three things do the work:

1. **301 redirects** for every old address that has a successor. `apps/storefront/src/lib/legacy-redirects.ts`
   holds the map; `next.config.ts` serves it. A 301 tells Google the page moved for good and
   to transfer what it earned to the new address
2. **410 Gone** for addresses that only existed because the site was WordPress: `/wp-admin`,
   `/wp-login.php`, `/feed/`, `/wp-json`, the WordPress sitemaps. `apps/storefront/src/proxy.ts`
   serves these. A 410 is a definite "this is gone", which Google acts on within days; a 404 is
   retried for months
3. **A fresh submission** from Beco's own Search Console, so the new sitemap is what Google reads
   and the old account's submission no longer matters

Nothing here needs the old account. Google follows the redirects whether or not anyone owns the
property that submitted the old pages.

## Step 1: Beco verifies the domain in Search Console

Do this once, before or after cutover; it takes ten minutes.

1. Sign in at `search.google.com/search-console` with Beco's Google account, the same one the
   Business Profile and GA4 live under. **Never a Brightex account**, see `docs/OWNERSHIP.md`
2. Add property. Choose **Domain**, enter `beco.co.ke`. Domain covers `www`, the bare domain,
   `http` and `https` at once, so the old site's addresses and the new site's are all one property
3. Google shows a TXT record. Send it to Brightex, who add it in Cloudflare, DNS, as a TXT record on
   the root with proxy status **DNS only**. Verification usually passes within minutes, sometimes
   up to an hour
4. Settings, Users and permissions: add `info.brightexsolutions@gmail.com` as **Full** user. Full,
   not Owner: Beco stay the owner

If the DNS route is blocked for any reason, the fallback is the HTML tag: Settings, Ownership
verification, HTML tag, copy the `content` value only, and Brightex set it as
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` on the storefront's Vercel project. The site renders it in
every page's `<head>`. Blank is fine; the tag simply is not emitted.

## Step 2: submit the sitemap

Search Console, Sitemaps, enter `https://www.beco.co.ke/sitemap.xml`, Submit.

The sitemap is generated from the database: every published product and category, every blog
post, with a last changed date on each product and post. Nothing is typed into it by hand, so it
is never out of date. It is enough to submit it once; Google re-reads it on its own.

If the old site submitted `sitemap_index.xml`, `wp-sitemap.xml` or a `*-sitemap.xml`, those now
answer 410 and Google will drop them. Nothing to do.

## Step 3: find the old URLs Google actually holds

This is the one step that needs a person, and it is where the map gets its exact entries.

1. In Search Console, open **Pages** (under Indexing). The "Not indexed" reasons will list
   "Page with redirect" and "Not found (404)". Open **Not found (404)** and export the list
2. Search Google for `site:beco.co.ke`. Every result is an address Google still holds. Click
   through each; it should land on a page here (a 301 worked) or on a plain "Gone" line (a 410
   worked). Anything landing on the site's own "page not found" is an address the map missed
3. Send the missed addresses to Brightex. Each gets a line in `LEGACY_REDIRECTS` pointing at the
   page that does its job now, and ships with the next deploy. There is a test that holds every
   line to the rule that the destination is a real page on this site

A product address from the old site, `/product/<anything>`, needs no entry: if the slug is not a
product here, the page sends the visitor to the shop searched for the words in it, with a 301.
`/product/calacatta-gold-slab` lands on the shop searched for "calacatta gold".

## Step 4: ask Google to look again

Only for pages that matter and are slow to move. Search Console, URL Inspection, paste the new
address, **Request indexing**. Google allows about ten a day. Use them on the home page, `/shop`,
the main category pages, and `/contact`.

For an old address you want out of results fast, Search Console, **Removals**, New request,
Temporarily remove URL. It hides the result for about six months, by which time the 301 or 410
has done the permanent work.

## What to expect

- Days 1 to 3: Google reads the sitemap and begins listing new addresses
- Weeks 1 to 4: old addresses show as "Page with redirect" in the Pages report and drop out of
  results as the new ones take their place. A dip in impressions during this window is normal
- Week 6 onwards: coverage settles. Watch the **Not found (404)** list weekly for a month; a new
  entry is an address the map missed, step 3 again

## What Brightex does

| When | What |
|---|---|
| Before cutover | Capture the baseline: indexed count, top queries, positions for the five target terms. Impossible to recover afterwards |
| Beco send the TXT record | Add it in Cloudflare, DNS only. Confirm verification passed |
| Beco send missed URLs | Add each to `LEGACY_REDIRECTS`, run the storefront tests, deploy |
| Monthly for three months | Read the Pages report with Beco. Confirm the 404 list is empty and impressions recovered |

## Why some choices were made

- **Static redirects over a database table.** The old site is fixed; its addresses are not going
  to grow. A table would need a screen to edit it, a cache, and a test for the cache, for a list
  that changes twice and then never
- **410 rather than 404 for WordPress paths.** Bots hammer `/wp-login.php` on every domain that
  ever ran WordPress. A 410 is cached for a day and costs nothing; a 404 renders the full not
  found page each time
- **A search landing for unknown product slugs** rather than a 404. Google holds product URLs
  with real search standing; sending them to the nearest useful page with a 301 keeps the
  standing and the visitor. The one risk, that a typo lands on a search page, is a better
  outcome than a dead end
- **No `www` to bare domain decisions here.** Cloudflare redirects the bare domain to `www` at
  the edge, per `docs/DEPLOYMENT.md` section 8.2. The map assumes `www`
