# M2: Drive import pipeline

Per CLAUDE.md rule 8. Ticked only when **checked**.

## Verified

- [x] Slug derivation, asserted against the 24 real folder names **and the slugs the M1 seed
      already inserted**, so the pipeline cannot create duplicates of products that exist
- [x] Role matcher, token set not token order. 7 tests
- [x] Misnest detector. Finds both products misfiled inside Amber Jade, names the accidental
      parent in the reason, and excludes them so a gallery cannot get another stone's photos
- [x] Five outcome classifier. 8 tests, including that a rename is **moved** rather than new
      plus missing, that content change wins over a move, and that a null md5 is not a change
- [x] `buildPlan`, pure and testable. 13 tests against fixtures reproducing every real defect
- [x] Fixture DriveSource: the real export, defects included, **no account and no network**
- [x] `--dry-run` runs end to end and prints the skipped items report

**Reconciles:** 125 files, 72 application, 7 bookmatch, 21 on stand, 23 slab, 2 unknown. On
stand is 21 because Moire White, Pure White and Sandstone Ivory genuinely lack that file.

## Design decision worth recording

The Drive layer sits **behind an interface**, so everything above it is testable with no service
account. That is why M2 could be built before the account existed, and it is also what CI uses,
since CI must never reach a real Drive folder.

## Still to build

- [x] **Service account works against the real folder.** Verified: 17 categories, 24
      stones, md5 on every file
- [x] **R2 works.** Verified: write, read, list, delete round trip
- [ ] Google Drive source implementation, wiring the verified access into `DriveSource`
- [ ] Sharp derivatives and R2 upload
- [ ] Read `import_files` from the database, so a second run genuinely downloads nothing. The
      CLI currently hardcodes an empty set, which is correct for a first run and honest about it
- [ ] Write `import_runs`, `import_issues`, `import_files`
- [ ] Upsert products and categories
- [ ] Daily scheduled report only run

## Open decision, flagged rather than taken silently

- [ ] Derivatives default to **WebP only at three widths** rather than AVIF and WebP at four,
      per `docs/REVIEW.md` 3.3. Halves storage and roughly halves import time, at maybe 20
      percent file size. **Configurable via `IMAGE_FORMATS` and `IMAGE_WIDTHS`**, so this is
      reversible in one environment variable rather than a rewrite

## A judgement the matcher makes, worth knowing

`Sandstone Beige 2201632A01171.jpg` resolves to **slab**, because the filename contains the full
folder name. That is the same rule that correctly resolves `BEVERLY GOLD.jpg`. It is defensible,
since the file does name the product, but it is a heuristic firing rather than a certainty.
`2201632A01171.jpg` in the same folder correctly resolves to unknown.
