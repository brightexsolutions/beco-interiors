import { createClient } from '@supabase/supabase-js';
import type { DriveSource } from './drive';
import { buildPlan, type ImportPlan, type PlannedFile } from './plan';
import { processImage } from './images';
import { assessQuality } from './quality';
import { createStorage } from './storage';
import { slugify, titleise } from './slug';

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
  uploaded: number;
  productsTouched: number;
  bytesIn: number;
  bytesOut: number;
  warnings: string[];
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
  const categorySlugs = [...new Set(plan.files.map((f) => f.categorySlug))];
  for (const slug of categorySlugs) {
    await sb.from('categories').upsert(
      { slug, name: titleise(slug.replace(/-/g, ' ')), is_published: true, source_path: slug },
      { onConflict: 'slug', ignoreDuplicates: true },
    );
  }
  const { data: cats } = await sb.from('categories').select('id,slug');
  const catId = new Map((cats ?? []).map((c) => [c.slug, c.id]));

  // Group by product so each one is written once with its full gallery.
  const byProduct = new Map<string, PlannedFile[]>();
  for (const f of plan.files) {
    const list = byProduct.get(f.productSlug) ?? [];
    list.push(f);
    byProduct.set(f.productSlug, list);
  }

  const ROLE_ORDER = ['slab', 'on_stand', 'bookmatch', 'application', 'unknown'] as const;
  let downloaded = 0, uploaded = 0, bytesIn = 0, bytesOut = 0;
  const warnings: string[] = [];

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

      log(`  ${productSlug}  ${file.path.split('/').pop()}`);
      const bytes = await source.download(file.driveFileId);
      downloaded++;
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
        md5_checksum: null,
        size_bytes: bytes.byteLength,
        product_id: null,
        role: file.role === 'unknown' ? null : file.role,
        status: file.outcome,
        last_seen_at: new Date().toISOString(),
        imported_at: new Date().toISOString(),
      }, { onConflict: 'drive_file_id' });
    }

    if (images.length) {
      await sb.from('products').upsert({
        name: first.productName,
        slug: productSlug,
        category_id: catId.get(first.categorySlug) ?? null,
        price_display_mode: 'poa',
        availability: 'poa',
        unit: 'per slab',
        is_published: true,
        images,
        source_path: `${first.categorySlug}/${productSlug}`,
      }, { onConflict: 'slug' });
    }
  }

  await sb.from('import_runs').update({
    finished_at: new Date().toISOString(),
    summary: { ...plan.counts, downloaded, uploaded, bytesIn, bytesOut,
               issues: plan.issues.length, warnings: warnings.length },
  }).eq('id', runId);

  return { runId, downloaded, uploaded, productsTouched: byProduct.size,
           bytesIn, bytesOut, warnings };
};
