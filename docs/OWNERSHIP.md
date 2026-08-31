# Ownership and Access

Reference BEC-2026-004-PLAN. Decisions D10, D19, D20, D21.

Assets are split by category, not by generosity. The client's identity and data are client
owned. The agency's work product and tooling are agency owned. The test that matters: **if
Brightex disappeared tomorrow, Beco's business keeps running.** Under this split it does. The
site keeps serving, the database keeps answering, quotes keep arriving, the domain keeps
resolving.

## Held by Beco

| Asset | Registered to | Brightex access |
|---|---|---|
| Domain registrar, beco.co.ke | Beco | One nameserver change at setup, then none |
| becointeriorsdev@gmail.com | Beco, created for this build | Password held by Brightex. Break glass only |
| Supabase org and project | becointeriorsdev | Member, own login |
| Cloudflare zone beco.co.ke | becointeriorsdev | Member with admin on the zone |
| Cloudflare R2, product images | becointeriorsdev | Same account |
| Resend, sending domain beco.co.ke | becointeriorsdev | Member, own login |
| cron-job.org keep alive | becointeriorsdev | Member or shared login |
| UptimeRobot | becointeriorsdev | Member or shared login |
| Google Cloud service account, Drive import | becointeriorsdev | Key file held by Brightex, never committed |
| Google Business Profile | Beco's own Google account | Manager |
| GA4 | Beco's own Google account | Editor |
| Search Console | Beco's own Google account | Full user |
| Google Drive, BECO PRODUCTS | okechirene21@gmail.com | Editor, and editors can re-share, so Brightex adds the import service account itself |
| Zoho Mail, info@beco.co.ke | Beco | None needed |
| WhatsApp Business, +254 722 333 730 | Beco | None needed, click to chat only |

Beco's own Google account and becointeriorsdev@gmail.com are different things and stay that
way. GA4, Search Console and the Business Profile must live under Beco's real account.

## Held by Brightex

Two things and nothing else.

| Asset | Notes |
|---|---|
| GitHub repository | Private. Holds all three surfaces including Brightex Studio |
| Vercel, two projects | Storefront and dashboard. Hobby today, Pro before cutover |
| Gemini API key | Brightex's own, server side in the dashboard, used only by the Studio routes. Never reaches a browser or the storefront. Goes with Brightex at handover |

Studio is not separately deployed. It is routes inside the dashboard at `/dashboard/studio`,
reachable only by an account that is both `brightex_admin` and on the `brightex_allowed_emails`
list. Beco retires Brightex's access by removing that email from the list, which is a single
edit rather than a DNS change.

### The Drive sharing chain

```
  okechirene21@gmail.com            OWNER, Beco side
        |
        |  shared as Editor
        v
  info.brightexsolutions@gmail.com  Brightex
        |
        |  shared onward as Editor, which only worked because
        |  the folder allows editors to change permissions
        v
  gbrownze@gmail.com                working account
        |
        |  same mechanism adds the import service account
        v
  beco-import@<project>.iam.gserviceaccount.com
```

Two consequences. Brightex can add and rotate the import service account without going back to
Irene, which removes a dependency from M2. And the access list will grow over time, so it is
worth auditing at launch and again at handover, since anyone in the chain can add more people.

If the owner ever turns off editor re-sharing, adding or rotating the service account needs
Irene again. Worth knowing before it happens rather than during an outage.

## Credential rules

**No day to day operation depends on a credential Brightex does not hold, and no client data
lives somewhere Beco cannot reach.**

becointeriorsdev is **break glass, not a daily driver**. Each service account is created from
it, then Brightex is invited as a member and works through its own login. That gives per person
audit trails, survives a staff change on either side, and makes revocation one click per
service rather than a password rotation that breaks everything at once.

The account is now load bearing, holding DNS, database, images and email at once, so it gets
the strongest protection in the project:

- TOTP or a hardware key. Not SMS
- Recovery address on a Beco controlled mailbox (Zoho)
- Recovery phone on a Beco director's number
- Backup codes printed, held by both parties
- No other use. No newsletters, no test signups

## Monthly costs

Dollar figures at roughly KES 130, indicative.

| Line | Provider | Cost | Paid by |
|---|---|---|---|
| Domain, beco.co.ke | Registrar | KES 2,000 to 3,500 per year | **Beco** |
| Hosting, three surfaces | Vercel Pro | USD 20 a month | **Brightex**, inside the retainer |
| Database, auth, document storage | Supabase | Free | Beco, when it upgrades |
| Product images and CDN | Cloudflare R2 | Free to 10GB, egress free | Beco account, free |
| DNS, WAF, rate limiting | Cloudflare | Free | Beco account, free |
| Transactional email | Resend | Free to 3,000 a month | Beco, when it upgrades |
| Keep alive cron | cron-job.org | Free | n/a |
| Uptime monitoring | UptimeRobot | Free | n/a |
| Code hosting and CI | GitHub | Free | Brightex |
| Business mailboxes | Zoho | Already paying, unchanged | Beco |

**Beco's day one recurring cost is the domain renewal. Nothing else.**

### What triggers a bill later

More visitors does not quickly cost more money on this architecture. Catalog pages are
statically generated so traffic does not hit the database, and images come off R2 where egress
is free. **What costs money is a bigger catalog, not a busier one.**

| Service | Free ceiling | Raise it when | Cost after |
|---|---|---|---|
| Supabase | 500MB db, 1GB storage, 2GB egress, 50k auth users | any reaches 70% | Pro, USD 25 a month |
| Cloudflare R2 | 10GB stored, egress free | 7GB stored | About USD 0.015 per GB per month |
| Resend | 3,000 a month, 100 a day | 2,000 a month | USD 20 a month |
| Vercel | Pro, one member | a second person needs deploy access | USD 20 per extra member |
| GitHub Actions | 2,000 minutes a month | 1,500 minutes | About USD 0.008 a minute |

Supabase's published limits change. Verify rather than trusting this table.

**Do not cancel the WordPress host on cutover day.** Keep it 30 days past the DNS change so a
rollback is possible and nothing needed is stranded.

## If the relationship ends

Full procedure, scenarios, verification checklist and the emergency path are in
**`docs/HANDOVER.md`**, which is written to be shown to Beco.

The short version: almost nothing moves. The database, DNS, images, email sender and monitoring
already sit in accounts Beco owns. Brightex holds only the repository and the Vercel projects,
and Beco holds a read only copy of the repository throughout, so a redeploy elsewhere takes
about an hour without Brightex's involvement.
