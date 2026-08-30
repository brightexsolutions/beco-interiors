---
name: drive-import
description: How a Drive folder becomes seeded categories, products, and image derivatives, including change detection and the skipped items report. Use for any work on the import pipeline.
---

# Drive import

Reads the Drive API directly through a service account. **The zip was a one time bootstrap and
is retired.** Never re download an archive to check for changes.

## Change detection

`import_files` holds every file ever seen: Drive file id, path, `md5Checksum`, size,
`modifiedTime`, resolved product and role, `last_seen_at`. The changes feed with a stored page
token handles routine runs; a weekly full listing reconciles.

| Outcome | Action |
|---|---|
| new | Download, process, import |
| changed | Same id, different md5. Reprocess, replace derivatives, bump cache key |
| moved | Same id, different path. Re resolve product and role, do not re download |
| unchanged | Skip. Should be nearly all of them |
| missing | **Flag, never auto delete.** A vanished file is as likely an accidental drag as an intent |

## Role resolution

Roles are `slab`, `on_stand`, `bookmatch`, `application`, `unknown`.

**Match on the token set, not the token order.** Normalise to uppercase, strip the extension,
collapse separators, compare as a set. `SLAB ON STAND`, `STAND ON SLAB` and `STONE ON SLAB` all
reduce to the same set and all resolve. This removes a whole class of failure.

A filename matching the folder name resolves to `slab`. A filename matching nothing resolves to
`unknown`, imports with a null role and filename sort, and is listed in the report. **It is
never guessed into a role.**

## Known defects in the real data, all covered by fixtures

- `AMBER JADE` contains `CYPRUS LIGHT GREY` and `GALAXY BIANCO` nested by mistake, byte
  identical to the top level folders. A folder nested inside a colour folder whose name matches
  a top level sibling is reported and skipped, never imported twice
- `SANDSTONE BEIGE` has five files with CJK supplier filenames and no role word. All import as
  `unknown` and the product is flagged incomplete
- `LIMESTONE CREAMY/DSC02078.JPG` is a raw camera filename
- `BEVERLY GOLD.jpg` and `STATUARIO GOLD.jpg` are slab shots named only after the product
- Five products have no on stand shot at all

## Rules

- Incremental and re runnable. **Running twice must produce zero changes on the second run**
- Sources reach 44MB. Derivatives are AVIF and WebP at 400, 800, 1200, 1600 plus a blur
  placeholder, written to R2. Never upload a raw file, never resize per request
- Reports what it skipped and why, into `import_issues`. Never fails silently, never invents
  a default
- Raw downloads live in `_incoming/`, gitignored, and never enter git
- Slugs derive from folder names so the taxonomy stays traceable to its source
