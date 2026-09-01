import { createClient } from '@supabase/supabase-js';
import type { DriveSource } from './drive';
import { buildPlan, type ImportPlan, type PlannedFile } from './plan';
import { processImage } from './images';
import { assessQuality } from './quality';
import { createStorage } from './storage';
import { slugify, titleise } from './slug';
import { readCache, writeCache } from './cache';

/**
 * Executes an import plan: downloads only what changed, generates derivatives,
 * uploads to R2, and writes products, categories and the run record.
 *
 * Every step records what it did, so `import_issues` is a queryable account of
 * what was skipped rather than console output that scrolls away.
 */

const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

export interface RunResult {
  runId: string;
  downloaded: number;
  cacheHits: number;
  uploaded: number;
  productsTouched: number;
  bytesIn: number;
  bytesOut: number;
  warnings: string[];
  /** Files that could not be processed. Recorded, never fatal. */
  failures: string[];
}

export const executePlan = async (
  plan: ImportPlan,
  source: DriveSource,
  opts: { onProgress?: (msg: string) => void } = {},
): Promise<RunResult> => {
  const sb = db();
  const storage = createStorage();
  const log = opts.onProgress ?? (() => {});

  const { data: run, error: runErr } = await sb
    .from('import_runs')
    .insert({ mode: 'full', summary: plan.counts })
    .select('id')
    .single();
  if (runErr) throw new Error(`could not open import run: ${runErr.message}`);
  const runId = run.id as string;

  if (plan.issues.length) {
    await sb.from('import_issues').insert(
      plan.issues.map((i) => ({ run_id: runId, path: i.path, reason: i.reason })),
    );
  }

  // Category, from the folder name, so the taxonomy stays traceable.
  // A category is identified by the Drive folder it came from, never by its
  // slug. The slug is derived, and it is editable in the dashboard, so keying
  // on it means an edited slug reappears as a second category on the next run.
  // That already happened once: the seeded row and an imported row described
  // the same folder, and the empty one would have shipped as a real page.
  const categories = new Map(plan.files.map((f) => [f.categoryPath, f.categorySlug]));
  for (const [sourcePath, slug] of categories) {
    await sb.from('categories').upsert(
      { slug, name: titleise(slug.replace(/-/g, ' ')), is_published: true, source_path: sourcePath },
      { onConflict: 'source_path', ignoreDuplicates: true },
    );
  }
  const { data: cats } = await sb.from('categories').select('id,source_path');
  const catId = new Map((cats ?? []).map((c) => [c.source_path, c.id]));

  // Group by product so each one is written once with its full gallery.
  const byProduct = new Map<string, PlannedFile[]>();
  for (const f of plan.files) {
    const list = byProduct.get(f.productSlug) ?? [];
    list.push(f);
    byProduct.set(f.productSlug, list);
  }

  const ROLE_ORDER = ['slab', 'on_stand', 'bookmatch', 'application', 'unknown'] as const;
  let downloaded = 0, uploaded = 0, bytesIn = 0, bytesOut = 0, cacheHits = 0;
  const warnings: string[] = [];
  const failures: string[] = [];

  for (const [productSlug, files] of byProduct) {
    const first = files[0]!;
    const images: unknown[] = [];

    const ordered = [...files].sort(
      (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
                a.path.localeCompare(b.path),
    );

    for (const [index, file] of ordered.entries()) {
      const keyBase = `${file.categorySlug}/${productSlug}/${file.role}-${index}`;

      if (!file.needsDownload) continue;

      // One bad file must never kill a whole run. Sharp's prebuilt binary
      // cannot decode iPhone HEIC, and a single such file was aborting the
      // entire import after twenty minutes of downloading. Now it is recorded
      // as an issue and the run continues, which is the same principle as
      // never guessing a role: report and carry on.
      try {
      // Cache hit means a db reset does not cost a re-download of 44MB.
      const cached = readCache(file.driveFileId, file.md5 ?? null);
      const bytes = cached ?? (await source.download(file.driveFileId));
      if (!cached) {
        writeCache(file.driveFileId, file.md5 ?? null, bytes);
        downloaded++;
      } else {
        cacheHits++;
      }
      log(`  ${productSlug}  ${file.path.split('/').pop()}${cached ? '  (cached)' : ''}`);
      bytesIn += bytes.byteLength;

      const quality = await assessQuality(bytes, file.path);
      for (const w of quality.warnings) warnings.push(w);

      const processed = await processImage(bytes);
      for (const d of processed.derivatives) {
        await storage.upload(`${keyBase}-${d.width}.${d.format}`, d.body, `image/${d.format}`);
        uploaded++;
        bytesOut += d.bytes;
      }
      for (const w of processed.warnings) warnings.push(`${file.path}: ${w}`);

      images.push({
        role: file.role,
        path: keyBase,
        alt: `${titleise(productSlug.replace(/-/g, ' '))} sintered stone, ${file.role.replace('_', ' ')}`,
        width: processed.width,
        height: processed.height,
        blur: processed.blurDataUrl,
        // Measured from the photograph itself, not guessed. Drives a colour
        // swatch, a colour filter, and flags images needing a reshoot.
        avgColor: quality.averageHex,
        dominantColor: quality.dominantHex,
        lightness: Math.round(quality.lightness),
        uniformBackground: quality.uniformBackground,
        sort: index,
      });

      await sb.from('import_files').upsert({
        drive_file_id: file.driveFileId,
        path: file.path,
        md5_checksum: file.md5,
        size_bytes: bytes.byteLength,
        product_id: null,
        role: file.role === 'unknown' ? null : file.role,
        status: file.outcome,
        last_seen_at: new Date().toISOString(),
        imported_at: new Date().toISOString(),
      }, { onConflict: 'drive_file_id' });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const heic = /heif|heic/i.test(message);
        failures.push(file.path);
        await sb.from('import_issues').insert({
          run_id: runId,
          path: file.path,
          reason: heic
            ? 'HEIC could not be decoded. iPhone photographs need converting to JPEG, or the ' +
              'camera set to Settings, Camera, Formats, Most Compatible. Skipped, and the rest ' +
              'of the run continued.'
            : `Could not process: ${message}. Skipped, and the rest of the run continued.`,
          detail: { error: message },
        });
        log(`  SKIPPED  ${file.path}  ${heic ? 'HEIC cannot be decoded' : message}`);
      }
    }

    if (images.length) {
      // The importer owns photographs and provenance. It does NOT own
      // commercial fields.
      //
      // A blind upsert rewrote price_display_mode, availability, unit and
      // is_published on every run, so the first nightly import after Beco
      // priced a product would have reset it to POA and republished anything
      // they had deliberately hidden. Drive knows what a stone looks like; it
      // does not know what it costs.
      //
      // So: defaults on first sight only, and thereafter only the fields Drive
      // is actually the authority for.
      const owned = {
        name: first.productName,
        category_id: catId.get(first.categoryPath) ?? null,
        images,
        source_path: first.productPath,
      };

      const { data: existing } = await sb
        .from('products')
        .select('id')
        .eq('slug', productSlug)
        .maybeSingle();

      if (existing) {
        await sb.from('products').update(owned).eq('id', existing.id);
      } else {
        await sb.from('products').insert({
          ...owned,
          slug: productSlug,
          price_display_mode: 'poa',
          availability: 'poa',
          is_published: true,
        });
      }
    }
  }

  await sb.from('import_runs').update({
    finished_at: new Date().toISOString(),
    summary: { ...plan.counts, downloaded, uploaded, bytesIn, bytesOut,
               issues: plan.issues.length, warnings: warnings.length },
  }).eq('id', runId);

  return { runId, downloaded, cacheHits, uploaded, productsTouched: byProduct.size,
           bytesIn, bytesOut, warnings, failures };
};
