import { createClient } from '@supabase/supabase-js';
import type { DriveSource } from './drive';
import { type CategoryNode, type ImportPlan, type PlannedFile } from './plan';
import { FINISH_LABEL, readFinish, type Finish } from './finish';
import { processImage } from './images';
import { assessQuality } from './quality';
import { createStorage } from './storage';
import { slugify, titleise } from './slug';
import { readCache, writeCache } from './cache';
import { toDecodable } from './decode';
import {
  mergeProductImages,
  parseStoredImages,
  type ImageEntry,
  type ProcessedImage,
} from './merge-images';

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

export interface ProductIdentity {
  name: string;
  category_id: string | null;
}

export interface ProductPhotography {
  images: ImageEntry[];
  source_path: string;
}

/**
 * What the importer writes for a product on this run.
 *
 * `name` and `category_id` are commercial identity, not photography. Once a
 * product row exists, the dashboard's own product editor is the source of
 * truth for them (D54), so they are set on insert only: the first time this
 * Drive folder is seen. Writing them again on every later update reverted a
 * dashboard rename or recategorisation back to the Drive folder name the
 * next time anything in that folder changed, including just adding a photo.
 *
 * `images` and `source_path` stay importer owned on every run: that half of
 * the D54 split still holds, and getting THAT array right is what
 * `mergeProductImages` is for.
 */
export const productWriteFields = (
  isExisting: boolean,
  fields: ProductIdentity & ProductPhotography,
): ProductPhotography | (ProductIdentity & ProductPhotography) =>
  isExisting ? { images: fields.images, source_path: fields.source_path } : fields;

/**
 * Where a product split by finish lands and what it is called, D122. With a
 * finish: "Black Hinge 1193" under Hinges, then Black Hinges, a sub range
 * whose identity is `HINGES/BLACK HINGES`, the path Beco would give that
 * folder if they made it in Drive. Without one: "Hinge 1193" in Hinges
 * itself, for a person to sort, rather than a guessed sub range.
 */
export const finishPlacement = (
  split: NonNullable<PlannedFile['splitByFinish']>,
  finish: Finish | null,
): { name: string; chain: CategoryNode[] } => {
  const range: CategoryNode = { path: split.folder, slug: slugify(split.folder), name: titleise(split.folder) };
  if (!finish) return { name: `${split.noun} ${split.ref}`, chain: [range] };
  const label = FINISH_LABEL[finish];
  const folder = `${label.toUpperCase()} ${split.folder}`;
  return {
    name: `${label} ${split.noun} ${split.ref}`,
    chain: [range, { path: `${split.folder}/${folder}`, slug: slugify(folder), name: titleise(folder) }],
  };
};

/**
 * Whether a file's photograph is processed on this run. A new or changed
 * file always is. So is an unchanged file whose product has no row yet:
 * without that, photographs already imported into the old single Hinges
 * product would never become products of their own, and a database reset
 * would leave every unchanged product missing until a forced run.
 */
export const needsProcessing = (file: Pick<PlannedFile, 'needsDownload'>, productExists: boolean): boolean =>
  file.needsDownload || !productExists;

/**
 * Creates every category folder the plan names, parents first, and returns
 * source_path to id. A new sub range whose derived slug is already taken by
 * another folder ("BLACK" under both HANDLES and KNOBS) gets its parent's
 * slug in front, so two folders never share one page.
 */
export const ensureCategories = async (
  sb: ReturnType<typeof db>,
  chains: readonly (readonly CategoryNode[])[],
): Promise<Map<string, string>> => {
  const nodes = new Map<string, { path: string; slug: string; name: string; parentPath: string | null }>();
  for (const chain of chains) {
    chain.forEach((node, index) => {
      if (!nodes.has(node.path)) {
        nodes.set(node.path, { ...node, parentPath: index > 0 ? chain[index - 1]!.path : null });
      }
    });
  }
  const ordered = [...nodes.values()].sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  const { data: existingRows } = await sb.from('categories').select('id,slug,source_path');
  const bySource = new Map((existingRows ?? []).map((c) => [c.source_path as string | null, c.id as string]));
  const slugTaken = new Map((existingRows ?? []).map((c) => [c.slug as string, c.source_path as string | null]));

  for (const node of ordered) {
    if (bySource.has(node.path)) continue;
    const parentId = node.parentPath ? (bySource.get(node.parentPath) ?? null) : null;
    const parentSlug = node.parentPath ? slugify(node.parentPath.split('/').pop()!) : '';
    const owner = slugTaken.get(node.slug);
    const slug = owner !== undefined && owner !== node.path && parentSlug ? `${parentSlug}-${node.slug}` : node.slug;
    const { data, error } = await sb
      .from('categories')
      .upsert(
        { slug, name: node.name, is_published: true, source_path: node.path, parent_id: parentId },
        { onConflict: 'source_path', ignoreDuplicates: true },
      )
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`could not create category ${node.path}: ${error.message}`);
    let id = data?.id as string | undefined;
    if (!id) {
      const { data: found } = await sb.from('categories').select('id').eq('source_path', node.path).maybeSingle();
      id = found?.id as string | undefined;
    }
    if (id) {
      bySource.set(node.path, id);
      slugTaken.set(slug, node.path);
    }
  }
  return new Map([...bySource].filter((entry): entry is [string, string] => entry[0] !== null));
};

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

  // Categories, from the folder names, so the taxonomy stays traceable.
  // A category is identified by the Drive folder it came from, never by its
  // slug. The slug is derived, and it is editable in the dashboard, so keying
  // on it means an edited slug reappears as a second category on the next run.
  // That already happened once: the seeded row and an imported row described
  // the same folder, and the empty one would have shipped as a real page.
  //
  // A chain is written top first, so a sub range (HANDLES/BLACK HANDLES)
  // finds its parent's id. Existing rows are never re-parented from here:
  // where a range is filed is the dashboard's decision once it exists.
  const catId = await ensureCategories(sb, plan.files.map((f) => f.categoryChain));

  // A range now split by finish used to import as ONE product holding every
  // photograph. That product is superseded, so it comes off the site rather
  // than sitting beside the products that replace it. Unpublished, never
  // deleted: the dashboard can bring it back, and nothing else is touched.
  for (const { folder } of [...plan.finishFolders, ...plan.photoFolders]) {
    const { data: retired } = await sb
      .from('products')
      .update({ is_published: false })
      .eq('source_path', folder)
      .eq('is_published', true)
      .select('id,name');
    for (const row of retired ?? []) {
      await sb.from('import_issues').insert({
        run_id: runId,
        path: folder,
        reason:
          `"${row.name as string}" held every photograph in "${folder}" as one product. Each ` +
          'photograph is now its own product, so it was unpublished. Delete it in the dashboard ' +
          'once the new products are checked.',
      });
      log(`  UNPUBLISHED  ${row.name as string}, replaced by one product per photograph`);
    }
  }

  // Folders the plan says hold more than one product. Their rows are created
  // for provenance, so the photographs and their source are recorded, but they
  // stay unpublished until Drive is reorganised.
  const mixedPaths = new Set(plan.mixed.map((m) => m.path));

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
    const processedImages = new Map<string, ProcessedImage>();
    let finish: Finish | null = null;

    // Looked up before any file is processed, so an unchanged file whose
    // product does not exist yet is still processed. See `needsProcessing`.
    // By slug, then by the Drive path it came from: the slug is editable in
    // the dashboard, and a renamed slug must not read as a missing product,
    // which would now import that product a second time on every run.
    const { data: bySlug } = await sb
      .from('products')
      .select('id,images')
      .eq('slug', productSlug)
      .maybeSingle();
    const { data: byPath } = bySlug
      ? { data: null }
      : await sb.from('products').select('id,images').eq('source_path', first.productPath).limit(1).maybeSingle();
    const existing = bySlug ?? byPath;

    const ordered = [...files].sort(
      (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
                a.path.localeCompare(b.path),
    );

    for (const [index, file] of ordered.entries()) {
      const keyBase = `${file.categorySlug}/${productSlug}/${file.role}-${index}`;

      if (!needsProcessing(file, Boolean(existing))) continue;

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

      // HEIC is not an edge case here: it is every photograph taken on an
      // iPhone with default settings, and all of Beco's hardware photography.
      // Sharp's prebuilt binary cannot decode it, so it is transcoded ONCE,
      // here, before anything else looks at the pixels.
      //
      // Decoding immediately before processImage was not enough: assessQuality
      // reads the image too, and it ran first, so every HEIC still failed on
      // the line above the fix.
      const decoded = toDecodable(bytes, file.path);

      const quality = await assessQuality(decoded, file.path);
      for (const w of quality.warnings) warnings.push(w);

      // Only for a product that has no row yet: where an existing one is
      // filed is the dashboard's decision, D54.
      if (file.splitByFinish && !existing && index === 0) {
        const reading = await readFinish(decoded);
        finish = reading.finish;
        log(`  ${productSlug}  finish ${finish ?? 'unclear'} (${Math.round(reading.share * 100)}% of the piece)`);
      }

      const processed = await processImage(decoded);
      for (const d of processed.derivatives) {
        await storage.upload(`${keyBase}-${d.width}.${d.format}`, d.body, `image/${d.format}`);
        uploaded++;
        bytesOut += d.bytes;
      }
      for (const w of processed.warnings) warnings.push(`${file.path}: ${w}`);

      processedImages.set(file.driveFileId, {
        role: file.role,
        path: keyBase,
        // The product's own category, never the flagship one. This said
        // "sintered stone" for every product in the catalogue, so a brass
        // handle was described as stone to a screen reader and to search.
        alt: `${titleise(productSlug.replace(/-/g, ' '))}, ` +
             `${titleise(first.categorySlug.replace(/-/g, ' '))}, ` +
             `${file.role.replace('_', ' ')}`,
        width: processed.width,
        height: processed.height,
        blur: processed.blurDataUrl,
        // Measured from the photograph itself, not guessed. Drives a colour
        // swatch, a colour filter, and flags images needing a reshoot.
        avgColor: quality.averageHex,
        dominantColor: quality.dominantHex,
        lightness: Math.round(quality.lightness),
        uniformBackground: quality.uniformBackground,
        // Lets a later run find this file's own entry again without
        // re-downloading it, so an unchanged file keeps its exact
        // derivatives instead of losing them to a full array replace.
        driveFileId: file.driveFileId,
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
            ? 'HEIC could not be decoded. The machine running the import needs a HEIC converter: ' +
              'sips on macOS, or libheif-examples and libheif-plugin-libde265 on Linux, which ' +
              'the import workflow installs. Skipped, and the rest of the run continued.'
            : `Could not process: ${message}. Skipped, and the rest of the run continued.`,
          detail: { error: message },
        });
        log(`  SKIPPED  ${file.path}  ${heic ? 'HEIC cannot be decoded' : message}`);
      }
    }

    // The importer owns photographs and provenance. It does NOT own
    // commercial fields, and past the first insert it does not even own the
    // full images array: an unchanged file's existing entry is carried
    // forward rather than dropped when the array is rebuilt. See
    // `mergeProductImages` and `productWriteFields`.
    //
    // A blind upsert used to rewrite price_display_mode, availability, unit,
    // is_published, name and category_id on every run, so the first nightly
    // import after Beco priced a product would have reset it to POA and
    // republished anything they had deliberately hidden, and would have
    // reverted a dashboard rename back to the Drive folder name the next
    // time anything in that folder changed. Drive knows what a stone looks
    // like; it does not know what it costs or what it is called once a
    // human has named it.
    const existingImages = parseStoredImages(existing?.images);
    const images = mergeProductImages(ordered, processedImages, existingImages);

    // Nothing processed this run, and the merged gallery is exactly what is
    // already stored, so no removal happened either: skip the write. Without
    // this, a fully unchanged product would still be upserted on every run,
    // which is what "running twice must produce zero changes" rules out.
    const changed = existing
      ? processedImages.size > 0 || images.length !== existingImages.length
      : images.length > 0;

    if (changed) {
      let name = first.productName;
      let categoryPath = first.categoryPath;
      if (first.splitByFinish && !existing) {
        const placement = finishPlacement(first.splitByFinish, finish);
        name = placement.name;
        categoryPath = placement.chain[placement.chain.length - 1]!.path;
        if (!catId.has(categoryPath)) {
          for (const [path, id] of await ensureCategories(sb, [placement.chain])) catId.set(path, id);
        }
      }
      const fields = {
        name,
        category_id: catId.get(categoryPath) ?? null,
        images,
        source_path: first.productPath,
      };

      if (existing) {
        await sb.from('products').update(productWriteFields(true, fields)).eq('id', existing.id);
      } else {
        await sb.from('products').insert({
          ...productWriteFields(false, fields),
          slug: productSlug,
          price_display_mode: 'poa',
          availability: 'poa',
          // A folder the plan flagged as holding SEVERAL products must not go
          // live. It imports as one product whose gallery mixes materials and
          // whose every photograph carries the wrong name, which is a wrong
          // specification rather than an untidy page.
          //
          // Refused here rather than by a migration, because a migration runs
          // before the importer has created the row: on a fresh environment
          // the unpublish would apply to nothing and the bad product would
          // arrive published. The pipeline that raises the flag is the only
          // thing that can hold it.
          is_published: !mixedPaths.has(first.productPath),
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
