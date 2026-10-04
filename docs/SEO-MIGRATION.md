# Taking the old site's place in Google

Reference D107. Written for Beco, who own the Google account, with the steps Brightex does
marked as such.

## The starting point

www.beco.co.ke ran a WordPress and WooCommerce site before this one. The developer who built it
submitted it to Google and left no record of where, under which account, or which URLs it had.
So the position on the day this site goes live is:

- Google holds an unknown number of old addresses for `beco.co.ke`: product pages, category
  pages, blog posts, and WordPress's own paths such as `/feed/` and `/wp-json`
- Those addresses were submitted from a Search Console property nobody at Beco can open
- Beco now have their own Google account, the one the Business Profile and GA4 live under
- The new site answers at the same domain, so this is a rebuild on one domain, not a move
  between domains. Google's "Change of address" tool does not apply and must not be used

The aim is simple: every old address Google holds hands its standing to the page that does its
job on this site, so the new addresses are what rank, and nobody has to find the old account
to make that happen.

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
property that submitted the old pages. If the old property is ever found, see the section near
the end; it is tidy up, not a prerequisite.

## Submitting the site to Google, in order

The whole procedure on one page. Each step is expanded below.

| # | When | Who | What | Done when |
|---|---|---|---|---|
| 0 | The week before cutover | Brightex | Capture the baseline: `site:beco.co.ke` result count, the five target terms' positions, the old site's impressions if any report exists | Numbers written into `docs/STATUS.md` |
| 1 | Any time before cutover | Beco, then Brightex | Verify the Domain property `beco.co.ke` in Beco's Search Console via a DNS TXT record; add Brightex as a Full user | Search Console shows the property as verified |
| 2 | Cutover day, once DNS points here | Brightex | Confirm `https://www.beco.co.ke/robots.txt` allows crawling and names the sitemap, and `https://www.beco.co.ke/sitemap.xml` lists the published pages | Both load in a browser |
| 3 | Cutover day | Beco or Brightex | Submit `https://www.beco.co.ke/sitemap.xml` in Search Console, Sitemaps | Status reads "Success" with a page count |
| 4 | Cutover day | Beco or Brightex | URL Inspection, Request indexing for the home page, `/shop`, each major category page and `/contact` | Each returns "Indexing requested" |
| 5 | Cutover day | Beco | Google Business Profile, edit the website link to `https://www.beco.co.ke/` if it points anywhere else | Profile shows the new link |
| 6 | Days 3 to 7 | Brightex, with Beco | Read Pages under Indexing; export Not found (404); add any missed old address to the redirect map and deploy | The 404 list is empty |
| 7 | Weekly for six weeks, then monthly | Brightex, with Beco | Re-read Pages and Performance; confirm impressions recover and new URLs replace old ones | Impressions back to baseline or above |

Steps 3 and 4 take about fifteen minutes together. Everything else is waiting and reading.

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

First confirm the site is open to crawling: `https://www.beco.co.ke/robots.txt` must allow
everything under `/` except `/quote`, `/design-system` and `/api/`, and must carry the
`Sitemap:` line naming `https://www.beco.co.ke/sitemap.xml`. Both files are generated by the
storefront, so if either is wrong the fix is a deploy, not a setting.

Then Search Console, Sitemaps, enter `https://www.beco.co.ke/sitemap.xml`, Submit. Within a
minute the row shows **Success** and a count of discovered pages. "Couldn't fetch" means
Google reached the address and got an error; open the URL in a browser, and if it loads, wait
an hour and resubmit, Google retries on its own schedule.

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

## The Google Business Profile

The profile is the other place Google learns the site's address, and it is the one most
customers see first. In the profile's Edit profile, Contact, set the website to
`https://www.beco.co.ke/`. If the old developer set it to a page that no longer exists, the
301 map will catch the click, but the profile should still name the home page. Owned by Beco
under the same Google account, with Brightex as a manager, per `docs/OWNERSHIP.md`.

## If the old Search Console property turns up

It is not needed, but it is worth closing. When a property is found, whoever holds it can add
Beco's account as an Owner (Settings, Users and permissions) and then remove themselves. Beco
then deletes the old property or leaves it; the Domain property verified in Step 1 already
covers every address it did. Do not submit the new sitemap from the old property, and do not
request removals from it. One property, Beco's, does all the work from here on.

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
