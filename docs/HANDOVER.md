# Handover and End of Engagement

Reference BEC-2026-004-PLAN. What happens to the Beco Interiors platform if Brightex stops
working on it, for any reason.

**This document is written to be shown to Beco.** A handover plan the client can read before
they need it is worth more than one written during a disagreement.

## The principle

The platform is built so that **Beco's business keeps running whether or not Brightex does.**
That is not a courtesy, it is an architectural decision made in week one and recorded as D19.

The test: if Brightex disappeared tomorrow with no notice, would the site keep serving, the
database keep answering, quotes keep arriving, and the domain keep resolving? Yes to all four,
because none of them depends on a Brightex account. Only future code changes would need a new
developer, and hiring a developer is a normal thing to do.

Because of that split, **handover is small.** Most of what a handover usually involves has
already been done, continuously, since setup.

---

## 1. Scenarios, and how each differs

| Scenario | What happens | Urgency |
|---|---|---|
| **Planned handover** | Beco takes the platform in house or moves to another agency. Full procedure below, worked through together | Scheduled |
| **Retainer paused or ended, no dispute** | Nothing technical changes immediately. The platform keeps running. Brightex stops making changes. Vercel Pro becomes Beco's cost, see section 6 | 30 days |
| **Relationship ends badly** | Same procedure, but assume no cooperation. Everything below is designed to work without Brightex's participation | Immediate |
| **Brightex unreachable, no notice** | The emergency path, section 7. Beco can restore full control alone, in about an hour | Immediate |

The procedure is the same in all four. Only the goodwill differs, which is exactly why it is
written down now.

---

## 2. What Beco already owns, so nothing transfers

This is most of the platform.

| Asset | Registered to | Status |
|---|---|---|
| Domain, beco.co.ke | Beco, at the registrar | Already Beco's |
| Cloudflare zone and DNS | becointeriorsdev | Already Beco's |
| Cloudflare R2, all product images | becointeriorsdev | Already Beco's |
| Supabase: database, auth, documents | becointeriorsdev | Already Beco's |
| Resend, sending from beco.co.ke | becointeriorsdev | Already Beco's |
| cron-job.org keep alive | becointeriorsdev | Already Beco's |
| UptimeRobot monitoring | becointeriorsdev | Already Beco's |
| Google Cloud service account, Drive import | becointeriorsdev | Already Beco's |
| Google Business Profile | Beco's own Google account | Already Beco's |
| GA4 and Search Console | Beco's own Google account | Already Beco's |
| Google Drive, BECO PRODUCTS | Beco | Already Beco's |
| Zoho Mail | Beco | Already Beco's |
| WhatsApp Business number | Beco | Already Beco's |
| **All customer, quote, order and product data** | In Beco's Supabase | Already Beco's |

**Every record the business depends on already sits in an account Beco holds the credentials
for.** No transfer request, no waiting period, no cooperation required.

---

## 3. What Brightex holds, and what happens to it

Two things.

### The GitHub repository

`brightexsolutions/beco-interiors`, private, holding all three surfaces.

Beco holds a **read only copy throughout the engagement** as a collaborator, per D21. That is
not a courtesy extended at exit, it is in place from setup precisely so exit is not a
negotiation.

At handover, one of:

- **Transfer** the repository to a Beco owned GitHub account or organisation, or
- **Fork or clone** it to a Beco account, which is what the read only access already permits

Ownership of the code as work product does not change by giving Beco a copy. Beco receives a
perpetual right to use, run and modify the platform built for them. Brightex retains the right
to reuse generic patterns and tooling that are not specific to Beco. This should be stated in
the engagement letter rather than assumed.

### The Vercel projects

Three deployments, on Brightex's Vercel account. **This is the only genuine dependency in the
entire platform**, and section 7 exists because of it.

At handover: Beco creates a Vercel account, connects the repository, and the three projects
redeploy. DNS already sits on Beco's own Cloudflare, so repointing is a record edit that Beco
makes themselves. No Brightex involvement is technically required.

---

## 4. The handover procedure

Each step names who does it and how it is verified. Nothing is marked done because it was
attempted.

| # | Step | Owner | Verified by |
|---|---|---|---|
| 1 | Beco creates a Vercel account, or nominates a successor agency's | Beco | Account exists, billing set |
| 2 | Repository transferred or cloned to a Beco owned account | Brightex, or Beco alone using the read only copy | `git clone` from the new location succeeds |
| 3 | Three Vercel projects created against the new repository | Beco or successor | All three build successfully |
| 4 | Environment variables recreated from `docs/ENVIRONMENT.md` | Beco or successor | Each surface boots and reaches the database |
| 5 | DNS records repointed on Beco's Cloudflare zone | Beco | All hostnames resolve to the new deployments over HTTPS |
| 6 | Certificate issuance confirmed, per the ordering in `docs/RUNBOOK.md` | Beco or successor | No redirect loop, padlock present on all hostnames |
| 7 | Brightex memberships removed: Cloudflare, Supabase, Resend, cron-job.org, UptimeRobot | Beco | Member list shows no Brightex account |
| 8 | becointeriorsdev password rotated, MFA re enrolled, backup codes reissued | Beco | Brightex's old credential fails to log in |
| 9 | Brightex removed from GA4, Search Console, Google Business Profile, Drive | Beco | Access lists checked |
| 10 | Drive service account key rotated, or the service account access revoked and reissued | Beco | Import pipeline runs with the new key |
| 11 | `developer.beco.co.ke` DNS record deleted, retiring Brightex Studio | Beco | Hostname no longer resolves |
| 12 | Brightex confirms in writing that local copies of credentials are destroyed | Brightex | Written confirmation received |
| 13 | Backup restore drill run once by the new owner | Beco or successor | A restored database boots the storefront |

Step 13 matters more than it looks. A handover where nobody has ever restored a backup is a
handover that has not really happened.

---

## 5. What Beco does not receive

**Brightex Studio**, the internal agency console at `developer.beco.co.ke`. Beco never paid for
it, never used it, and it is Brightex operational tooling for running the agency side of this
and other engagements. It is removed at handover, not transferred.

Everything it read is Beco's and stays Beco's: `analytics_events` and `blog_posts` live in
Beco's own database and are unaffected by Studio going away. Published blog content remains on
the site. Only the authoring and cross client reporting interface disappears.

If Beco wants a replacement blog editor after handover, that is a small piece of new work, not
a recovery of something withheld.

---

## 6. What changes commercially

During the engagement Brightex carries Vercel Pro at about USD 20 a month inside the retainer,
per D18. **After handover that becomes Beco's cost.**

| Line | Before handover | After handover |
|---|---|---|
| Domain renewal | Beco, KES 2,000 to 3,500 a year | Unchanged |
| Vercel Pro, three surfaces | **Brightex, in the retainer** | **Beco, about USD 20 a month** |
| Supabase | Free until limits | Unchanged |
| Cloudflare and R2 | Free | Unchanged |
| Resend | Free under 3,000 a month | Unchanged |
| Monitoring, cron | Free | Unchanged |

So the practical delta for Beco is roughly **USD 20 a month**, plus whatever a new developer
costs. Everything else is already theirs and already free tier.

Alternatives worth knowing: the same repository deploys to Netlify's free tier, which permits
commercial use, in about an hour. That is the documented fallback in `docs/RUNBOOK.md` and it
reduces the delta to zero, at the cost of Vercel's build performance.

---

## 7. If Brightex becomes unreachable without notice

This is the scenario the architecture was actually designed for. **Beco can restore full
control alone.**

What keeps working immediately, with no action:

- The site keeps serving, because Vercel deployments are immutable and keep running
- The database keeps answering, because it is Beco's Supabase project
- Quotes keep arriving, because Resend is Beco's account sending from Beco's domain
- Images keep loading, because R2 is Beco's bucket
- DNS keeps resolving, because the zone is Beco's

What Beco cannot do until they act: **deploy a change.** That is the whole extent of the
dependency.

### The one hour recovery

1. Log into `becointeriorsdev@gmail.com`, which Beco holds
2. Clone the repository from the read only copy Beco already has
3. Create a Vercel or Netlify account, connect the repository
4. Recreate environment variables from `docs/ENVIRONMENT.md`, values from Beco's password
   manager and from the Supabase, Resend and R2 dashboards Beco can already log into
5. Deploy, then repoint the DNS records on Beco's own Cloudflare zone
6. Rotate the becointeriorsdev password and remove Brightex's memberships

No step in that list requires Brightex.

**The two prerequisites, which must be true before they are needed:**

- Beco's read only repository access is in place and has been tested with an actual clone
- Beco holds the becointeriorsdev credentials and its MFA backup codes, stored somewhere other
  than in Brightex's possession

Both are set up during M1 and confirmed at launch. **If either is not true, this document is
fiction.** Verify them at handover, and again annually.

---

## 8. Getting the data out, at any time

Beco owns the data and should be able to take it whenever they want, not only at exit.

| Data | How |
|---|---|
| Products, categories, quotes, orders, documents, users, audit log | Supabase dashboard, table export to CSV. Or `pg_dump` for the whole database |
| Generated PDFs | Supabase Storage, bucket download |
| Product images | Cloudflare R2 bucket, or regenerate from Drive by re running the import |
| Blog posts, testimonials, announcements | Same as products |
| Analytics | `analytics_events` table export, plus GA4 which is on Beco's own Google account |
| Original photography | Google Drive, which Beco already owns and which is the source of truth |

The nightly encrypted backup, running into Beco's own Drive folder, is already a continuous
export. Beco does not have to ask for their data. They already have a copy of it every night.

---

## 9. What Brightex keeps, and for how long

| Item | Retention |
|---|---|
| Local clones of the repository | Deleted at handover, confirmed in writing |
| Credentials for Beco held accounts | Deleted at handover, and rendered useless by Beco's rotation regardless |
| Local backup copies of the database | Deleted at handover. The live backups run into Beco's Drive and are unaffected |
| `_incoming/` raw Drive downloads | Deleted. Beco holds the originals in Drive |
| Brightex Studio code and its cross client reporting | Retained. Agency property, contains no Beco data after removal |
| Generic patterns, skills and tooling not specific to Beco | Retained and reused |

---

## 10. Knowledge transfer

The documentation is the handover. It is written as each milestone lands rather than assembled
at the end, which is why it is worth reading rather than skimming.

| Document | For whom |
|---|---|
| `docs/ARCHITECTURE.md` | The incoming developer. Fifteen flows, drawn |
| `docs/SCHEMA.md` | Tables, relationships, RLS intent per table |
| `docs/RUNBOOK.md` | Deploy, roll back, restore, DNS and certificate ordering, incidents |
| `docs/ENVIRONMENT.md` | Every variable by name and where its value lives |
| `docs/OWNERSHIP.md` | The account matrix and monthly costs |
| `docs/SECURITY.md` | The RLS role matrix and the pre launch test list |
| `docs/DECISIONS.md` | Why things are the way they are, and what would reverse each |
| `docs/STAFF-GUIDE.md` | Beco's own staff. Raise a quote, update stock, issue a PDF |
| `docs/QA-CHECKLIST.md` | What must be walked by hand before a release |
| `CLAUDE.md` and `AGENTS.md` | The rules any developer or agent works under |

A live walkthrough with the incoming developer is offered as part of a planned handover. It is
not required for the platform to be operable, which is the point.

---

## 11. Handover verification

The handover is complete when every one of these is true and has been checked, not assumed.

- [ ] All hostnames resolve to deployments Beco controls, over HTTPS
- [ ] A change can be deployed by Beco or their developer, proven by deploying one
- [ ] Brightex has no membership on Cloudflare, Supabase, Resend, monitoring, or the Google
      properties
- [ ] becointeriorsdev password rotated and MFA re enrolled
- [ ] Drive service account key rotated, and the import pipeline runs on the new key
- [ ] A quote can be submitted on the site and appears in the dashboard
- [ ] A quote PDF generates and sends
- [ ] The nightly backup ran, and a restore from it was performed successfully
- [ ] `developer.beco.co.ke` no longer resolves
- [ ] Beco holds the repository and has cloned it independently
- [ ] Brightex has confirmed destruction of local credentials in writing

Until the restore drill and the test deployment are both done, the handover is on paper only.

---

## Review

This document is reviewed at launch, then annually, and whenever the account matrix changes. An
exit plan that describes accounts which no longer exist is worse than none, because it is
trusted.

Last reviewed: at creation, M0.
