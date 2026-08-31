# Brightex Project Playbook

**Written to be copied to the next project**, client or internal. Everything here was learned on
Beco rather than assumed, and each item exists because something went wrong without it.

Take this file, `CLAUDE.md`, the skills, and the document set. Change the specifics, keep the
shape.

---

## 1. First commit is rules, not code

`CLAUDE.md` with the durable constraints. `AGENTS.md` as a **symlink** to it, so Claude Code and
Codex read the same bytes and cannot drift onto different rules. Skills in `.claude/skills/`,
one per repeatable workflow.

**Every rule that matters gets a mechanical backstop in CI, not just a sentence.** A sentence
states the standard; the check is what survives a tired Friday.

| Rule | Backstop |
|---|---|
| No em dashes | grep in CI |
| No browser dialogs | grep in CI |
| Contrast meets AA | executable script, fails the build |
| Secrets never in the repo | pattern scan over tracked files |
| Agent attribution never in commits | `commit-msg` hook in `.githooks`, committed |
| `AGENTS.md` stays a symlink | CI asserts `readlink` |

## 2. Fix `.gitignore` before anything else

Check what is sitting in the working directory first. On Beco a 1GB client asset archive was in
the repo root, one `git add .` from a repository nobody could clone. The existing `.gitignore`
also excluded `docs/`, which is where documentation belongs.

Two directories every project wants: `_incoming/` for raw client assets, gitignored, and
`files/` for internal briefs not for client distribution.

## 3. Verify against primary sources

Do not build on a summary. Read the actual brand guideline, open the actual asset folder,
inspect the actual competitor site in DevTools.

On Beco: the palette summary was wrong, the asset count was wrong by more than double, the
approved prototype's entire catalogue was invented for the pitch, and a competitor's technique
was the opposite of what its server HTML suggested.

**Write a content audit** separating confirmed from unverified from contradicted. Anything
heading into structured data, a Google Business Profile, or a public claim gets confirmed first,
because those propagate and are painful to unpick.

## 4. Split ownership by asset category

- **Client identity and data**: domain, DNS, database, email sender, analytics, media. Client
  owned, always
- **Agency work product**: repo, CI, deploy pipeline, agency API keys. Agency owned, with a copy
  granted to the client
- **Shared operational surface**: monitoring, cron. Either

The test: **if the agency disappeared tomorrow, would the client's business keep running?**

Write `OWNERSHIP.md` and `HANDOVER.md` at setup, not at exit. Give the client a read-only repo
copy from day one so the deploy platform is a contingency rather than a dependency. Review
annually: an exit plan naming accounts that no longer exist is worse than none, because it is
trusted.

## 5. Two databases, always

Production and staging as separate projects. Preview deploys and every test point at staging.
**Nothing but production ever touches production data.**

**Seed staging, never clone it.** Customer records are personal data, and copying them into an
environment more people can reach is a data protection problem rather than a convenience.
Seeding also makes staging deterministic, so a failing test means a real regression.

## 6. CI owns deployment, not the Git integration

Platform Git integrations build every push whether or not tests pass, so you learn a build is
broken after it deployed. They also burn build minutes on work in progress, have no opinion
about whether a migration ran before the deploy that needs it, and offer no approval gate.

Wire CI to deploy previews only after tests pass, apply migrations before the deploy that needs
them, and gate production behind an approval environment. **Disable the platform's Git
integration explicitly**, or it races the pipeline.

## 7. Migrations carry their policies and their tests

A table does not exist without its RLS policies and their tests **in the same migration**. There
is no follow-up commit for policies, because that commit never comes.

Prove the **negative**, not only the positive. Assert that every table has RLS enabled, so a
future table cannot ship without it.

Two Postgres details worth knowing: a failing `USING` clause **filters rows silently**, a
failing `WITH CHECK` **raises 42501**. And a `language sql` function is parsed at CREATE time,
so it cannot reference a table a later migration creates.

## 8. Tests independent of seed data

Prefix fixtures, count only those, use fixed UUIDs rather than `limit 1`. A realistic seed
broke three passing tests on Beco the moment it was added.

## 9. Track written separately from verified

Expand each milestone into a written todo before coding. **Tick only what was checked against
reality.** Keep a third state for written-but-unverified.

This caught a migration ordering bug on Beco that looked correct on review and failed on a clean
replay.

## 10. Say what is still open

At every close, name the gaps rather than rounding up. `STATUS.md` carries done, in progress,
pending, blocked and **open**, where open means a known gap deliberately not fixed yet.

A status report that only lists wins is not a status report.

---

## The document set worth copying

| File | Purpose |
|---|---|
| `CLAUDE.md` + `AGENTS.md` symlink | Rules both agents read |
| `docs/STATUS.md` | The single place to look |
| `docs/PLAN.md` | Milestones, cut order, deferred items |
| `docs/DECISIONS.md` | What, why, and what would reverse it |
| `docs/ARCHITECTURE.md` | Flows drawn, not described |
| `docs/SCHEMA.md` | Tables and RLS intent |
| `docs/OWNERSHIP.md` | Account matrix and monthly costs |
| `docs/HANDOVER.md` | What happens if we stop. Written to show the client |
| `docs/RETAINER.md` | Terms, the monthly checklist, what ends it |
| `docs/SETUP.md` | Accounts, keys, ordered by what each unblocks |
| `docs/DEPLOYMENT.md` | Provisioning, config values, launch checklist |
| `docs/ENVIRONMENT.md` | Every variable by name. **Never values** |
| `docs/REVIEW.md` | Known weaknesses, written adversarially |
| `docs/QA-CHECKLIST.md` | What must be walked by hand |
| `docs/COMPONENTS.md` | The shared inventory |
| `docs/PLAYBOOK.md` | This file |
