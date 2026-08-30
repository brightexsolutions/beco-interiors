# Retainer Engagement: Beco Interiors

Reference BEC-2026-004-PLAN. The reference document for how the ongoing relationship runs after
launch: what is charged, what is delivered, what Beco owes in return, and what ends it.

Sections 2 to 7 are written to be used directly in a client agreement. Section 1 and section 10
are Brightex commercial reasoning and are not for client distribution.

---

## 1. Why a retainer exists here, honestly

Not every project needs one. This one does, and the argument is operational rather than
commercial.

The platform runs on free tiers deliberately. That works, but it comes with maintenance that is
genuinely not optional:

| Reality | Consequence if nobody does it |
|---|---|
| Supabase free projects pause after roughly a week of no API activity | **The site breaks.** The keep alive cron must keep running and be seen to be running |
| Free tier ceilings exist: 500MB database, 1GB storage, 2GB egress, 10GB R2, 3,000 emails | The site degrades or stops at a threshold nobody was watching |
| Dependencies accumulate vulnerabilities | A known CVE sits in a live client platform |
| Backups run nightly | An unverified backup is not a backup. Someone has to check, and periodically restore |
| Fifteen categories are still being populated | Someone runs the import, reviews what it skipped, and fixes what it flagged |
| Certificates, DNS, deliverability | SPF, DKIM and DMARC drift, and quote emails start landing in spam |

None of that is invented work. It is the actual cost of keeping a free tier platform alive, and
it is why the base tier is not optional in the way a marketing retainer would be.

**Say this plainly to the client.** The honest version sells better than the vague version,
because "we watch five usage ceilings and restore a backup every quarter" is checkable and
"ongoing maintenance and support" is not.

---

## 2. Tiers and pricing

Month to month. No minimum term. Prices reviewed annually, section 7.

### Essential Care, KES 6,000 a month

Keeps the platform alive and secure. The floor.

- Hosting, domain and DNS management
- SSL monitoring and renewal
- Supabase keep alive, verified monthly not assumed
- Nightly backup monitoring, with a restore drill every quarter
- Security updates and dependency patching, Dependabot reviewed monthly
- Free tier usage monitoring against all five ceilings, with early warning before any upgrade
- Uptime monitoring on all live surfaces
- **2 hours of technical support a month**

### Growth Plan, KES 15,000 a month

Everything in Essential Care, plus the work that makes the platform earn.

- SEO performance monitoring and a monthly report
- GA4 and `analytics_events` monthly insight report, including lead conversion by channel
- Search Console monitoring: coverage errors, 404s, index status
- Core Web Vitals checked against the performance budget
- Product listing, pricing and stock updates as requested
- **Drive import runs as new content lands, with the skipped items report reviewed and
  resolved**
- **4 hours of technical support a month**

### Full Partnership, KES 30,000 a month

Everything in Growth Plan, plus content and strategy.

- 2 blog articles written and published a month, targeting the agreed search terms
- Social copy for Instagram and Facebook
- Priority support, 4 hour response during business hours
- Quarterly digital strategy review

**Recommended tier for Beco at launch: Growth Plan.** Fifteen categories are still being
populated, so the import runs and the SEO work in that tier are the difference between the
catalog filling out properly and it filling out unevenly. Essential Care alone would leave that
to Beco.

---

## 3. What is not included

Explicit, because an unbounded retainer is worse for both sides.

| Not included | Handled as |
|---|---|
| New features or new surfaces | Quoted separately as a project |
| Online payments, M-Pesa or card | Phase 2, quoted separately |
| Automated WhatsApp intake via Meta's API | Phase 2, quoted separately |
| Customer accounts or a buyer portal | Phase 2, quoted separately |
| Redesigns, or changes to the approved design system | Quoted separately |
| Google Ads or Meta Ads | **Not offered at all.** Brightex does not provide this service |
| Photography, product data entry at volume, copywriting beyond the tier | Quoted separately |
| Third party service fees | Passed through at cost, section 4 |
| Work caused by Beco changing infrastructure without notice | Billed hourly |

**Support hours** cover fixes, small changes, questions and advice. They do not roll over, and
they are not a feature budget. Anything larger than the remaining hours is quoted before it
starts, never absorbed silently and never billed as a surprise.

---

## 4. Pass through costs

Billed at cost with invoices attached, or paid directly by Beco. Never marked up.

| Line | Cost | Paid by |
|---|---|---|
| Domain, beco.co.ke | KES 2,000 to 3,500 a year | Beco, directly |
| Vercel Pro, three surfaces | About USD 20 a month | **Brightex, inside the retainer** |
| Supabase | Free until limits, then about USD 25 a month | Beco, when triggered |
| Cloudflare and R2 | Free | Beco account, free |
| Resend | Free under 3,000 a month, then about USD 20 | Beco, when triggered |
| Monitoring and cron | Free | Free |

**Beco's day one recurring cost is the domain renewal.** Everything else is free tier or
carried by Brightex inside the retainer.

Any upgrade is proposed before it is needed, with the usage figures that justify it, never
after a limit has already been hit. The upgrade conversation happens at 70 percent of a
ceiling.

---

## 5. Terms

| Term | Value |
|---|---|
| Billing cycle | Monthly, in advance |
| Payment terms | Within 7 days of invoice |
| Minimum term | None. Month to month |
| Notice to pause or cancel | 30 days, either side, in writing |
| Support hours | Mon to Fri, 9am to 6pm EAT |
| Response, Essential and Growth | Within 1 business day |
| Response, Full Partnership | Within 4 business hours |
| Critical incident, any tier | Best effort immediately. Site down, data loss, or a security incident |
| Unused support hours | Do not roll over |
| Price review | Annually, with 60 days notice of any change |

**Critical incident** means the storefront is down, the dashboard is unreachable, quotes are
not arriving, or there is a suspected security breach. Everything else is a normal request.

---

## 6. What Beco provides

A retainer is a two sided arrangement, and most retainers that go badly do so because this half
was never written down.

- **A single point of contact** for content and approvals, empowered to decide
- **Content in the agreed format:** Drive folders following `docs/CONTENT-CONVENTIONS.md`,
  product data in the agreed sheet. Content that does not follow conventions takes longer and
  eats support hours
- **Timely approvals.** Work paused waiting on approval still consumes the month
- **Continued access** to the accounts Brightex needs as a member. Removing access without
  notice pauses the retainer, since the work becomes impossible
- **Reasonable notice** of anything Beco changes independently: DNS, mailbox settings, the
  Drive folder, or account permissions
- **Payment on terms**

---

## 7. Review

Reviewed at 3 months, then annually. The review covers whether the tier still matches actual
usage, whether support hours are consistently over or under used, and whether any free tier is
approaching a ceiling.

A tier can move up or down at any month boundary with 30 days notice. Moving down is a normal
outcome, not a failure. Once the catalog is fully populated and stable, Growth Plan may
legitimately become Essential Care.

---

## 8. The monthly work, concretely

This is what "maintenance" actually means, so that it is checkable rather than trusted. Run
through it once a month and record the result. Brightex Studio exists to make this quick.

### Every month

**Keeping it alive**

- [ ] Keep alive cron fired every run this month. Check cron-job.org history, do not assume
- [ ] Nightly backups present for every night. Check the Drive folder and the workflow artifacts
- [ ] Uptime report reviewed. Any incident understood, not just noted
- [ ] SSL valid on all live hostnames, with more than 30 days remaining
- [ ] Dependabot alerts reviewed. Security patches applied or consciously deferred with a reason

**Watching the ceilings**, with the trigger at 70 percent

- [ ] Supabase database size against 500MB
- [ ] Supabase storage against 1GB
- [ ] Supabase egress against 2GB
- [ ] Cloudflare R2 against 10GB
- [ ] Resend sends against 3,000
- [ ] Vercel build minutes and bandwidth
- [ ] GitHub Actions minutes against 2,000, which now matters because the repo is private

**Content and catalog**, Growth and above

- [ ] Drive import run for anything new
- [ ] `import_issues` reviewed. Anything `unknown` or `missing` resolved, not left sitting
- [ ] New categories flipped from noindex to indexed once they hold published products
- [ ] Product, price and stock updates applied as requested

**Performance and search**, Growth and above

- [ ] Core Web Vitals against budget: LCP under 2.0s, CLS under 0.05, INP under 200ms
- [ ] Search Console: coverage errors, 404s, index status, manual actions
- [ ] Rankings for the five target terms against the pre migration baseline
- [ ] Monthly report sent: traffic, leads by channel, quote conversion, WhatsApp and call clicks

**Operational hygiene**

- [ ] Audit log skimmed for anything unexpected: role changes, unusual deletions, failed logins
- [ ] Dashboard user list still matches who actually works there. Leavers deactivated
- [ ] Quote response times against the 2 hour promise the site makes

### Every quarter

- [ ] **Restore drill.** Restore the latest backup into a scratch project and boot the site
      against it. An unverified backup is not a backup
- [ ] **Access audit.** Who can reach the Drive folder, the dashboard, the Supabase project, the
      Cloudflare account. The Drive chain in particular grows, since editors can re-share
- [ ] Dependency major versions reviewed, not just patches
- [ ] Strategy review, Full Partnership only

### Every year

- [ ] `docs/HANDOVER.md` reviewed against reality. An exit plan naming accounts that no longer
      exist is worse than none, because it is trusted
- [ ] Beco's read only repository access tested with an actual clone
- [ ] becointeriorsdev MFA backup codes confirmed to still be held by Beco
- [ ] Domain renewal confirmed
- [ ] Free tier against paid reviewed properly, with a year of usage data
- [ ] Retainer tier and pricing reviewed

---

## 9. What ends it

| Ending | Notice | What happens |
|---|---|---|
| **Beco gives notice** | 30 days, written | Work continues through the notice period. Handover procedure runs. `docs/HANDOVER.md` |
| **Brightex gives notice** | 30 days, written | Same, and Brightex completes anything in flight or refunds the unused portion |
| **Paused by agreement** | 30 days | Nothing technical changes. The platform keeps running. **Beco must take over the monthly checklist in section 8, or accept the consequences in section 1** |
| **Non payment** | 14 days after a written reminder | Work stops. Access is not revoked and nothing is switched off. Beco's data and accounts remain entirely theirs, because they always were |
| **Scope breakdown** | Immediate, by agreement | Where the relationship is not working for either side. Handover runs normally |
| **Serious breach** | Immediate | Misuse of access, or anything unlawful. Handover runs, access removed same day |

### What never happens, on any ending

**Brightex does not hold the platform hostage.** There is no scenario in this document where
Beco loses access to their own site, data, domain, or accounts, because Brightex does not hold
them in the first place. That is D19, decided in week one, and it is deliberate.

On any ending, whatever the circumstances:

- The site keeps serving
- The database, DNS, images, email and monitoring stay in Beco's accounts, untouched
- Beco keeps a full copy of the code
- The nightly backup into Beco's own Drive keeps whatever it last wrote

The only thing that stops is Brightex doing work.

### On the last day

Run the handover procedure in `docs/HANDOVER.md`, sections 4 and 11. In short: Beco takes over
the Vercel deployments, Brightex memberships are removed, credentials are rotated, Studio's DNS
record is deleted, and a restore drill plus a test deployment prove the handover actually
worked rather than merely happened.

**Vercel Pro moves to Beco at that point**, roughly USD 20 a month, since Brightex was carrying
it inside the retainer. That is the entire commercial delta.

---

## 10. Commercial notes, internal only

Not for client distribution.

**Essential Care at KES 6,000 is thin once Vercel Pro sits inside it.** About KES 2,600 goes
straight back out, leaving roughly KES 3,400 against two support hours plus the monthly
checklist. That is close to break even on a good month and loss making on a bad one.

Three ways to fix it, in order of preference:

1. **Steer Beco to Growth Plan**, which is the right tier for them anyway while fifteen
   categories are still being populated. The recommendation in section 2 is honest, not a
   sales line
2. **Pass Vercel Pro through** to Beco on Essential Care only, keeping it absorbed on the
   higher tiers as a genuine incentive to move up
3. **Reprice Essential Care** to KES 8,500 at the next annual review

Do not solve it by quietly reducing what Essential Care delivers. The checklist in section 8 is
what keeps a free tier platform alive, and cutting it produces an outage that costs more than
the margin ever did.

**Watch the support hours.** If Beco consistently exceeds their tier's hours, that is a signal
to move them up, not to absorb it. Absorbed overage is how a retainer becomes resented on both
sides.

**Studio pays for itself here.** Most of section 8 is reading numbers off dashboards across
several services. Studio's cross platform reporting is what turns that from an hour into ten
minutes, which is the entire reason it exists and why it is unbilled.
