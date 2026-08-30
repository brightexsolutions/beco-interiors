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
| Google Drive, BECO PRODUCTS | okechirene21@gmail.com | Editor, plus a service account share from the owner |
| Zoho Mail, info@beco.co.ke | Beco | None needed |
| WhatsApp Business, +254 722 333 730 | Beco | None needed, click to chat only |

Beco's own Google account and becointeriorsdev@gmail.com are different things and stay that
way. GA4, Search Console and the Business Profile must live under Beco's real account.

## Held by Brightex

Two things and nothing else.

| Asset | Notes |
|---|---|
| GitHub repository | Private. Holds all three surfaces including Brightex Studio |
| Vercel, three projects | Hobby today. Pro before cutover, see Risks |

Brightex Studio deploys from Brightex's Vercel but answers on `developer.beco.co.ke`, a record
on Beco's Cloudflare zone. Beco can therefore retire Studio by deleting one DNS record. That is
a reasonable place for the control to sit given it is their domain.

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
