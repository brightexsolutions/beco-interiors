import type { ImportPlan } from './plan';

/**
 * The skipped items report.
 *
 * The pipeline never fails silently and never invents a default, so this is
 * how a human learns what could not be placed and why. It is written to be
 * read by whoever manages the catalogue, not only by a developer.
 */
export const renderReport = (plan: ImportPlan): string => {
  const L: string[] = [];
  const c = plan.counts;

  L.push('');
  L.push('IMPORT PLAN');
  L.push('===========');
  L.push('');
  L.push(`  new        ${c.new}       will be downloaded and processed`);
  L.push(`  changed    ${c.changed}       content differs, will be reprocessed`);
  L.push(`  moved      ${c.moved}       renamed, role re resolved, NOT re downloaded`);
  L.push(`  unchanged  ${c.unchanged}       skipped`);
  L.push(`  missing    ${c.missing}       flagged only, never deleted`);
  L.push('');
  L.push(`  ${plan.files.filter((f) => f.needsDownload).length} file(s) to download`);
  L.push('');

  const byRole = plan.files.reduce<Record<string, number>>((acc, f) => {
    acc[f.role] = (acc[f.role] ?? 0) + 1;
    return acc;
  }, {});
  L.push('  roles resolved:');
  for (const [role, n] of Object.entries(byRole).sort()) L.push(`    ${role.padEnd(12)} ${n}`);
  L.push('');

  if (plan.misnests.length) {
    L.push('MISFILED FOLDERS');
    L.push('----------------');
    L.push('  Skipped, so their photographs do not appear in the wrong product.');
    L.push('');
    for (const m of plan.misnests) L.push(`  ${m.path}\n    ${m.reason}`);
    L.push('');
  }

  if (plan.mixed.length) {
    L.push('FOLDERS HOLDING MORE THAN ONE PRODUCT');
    L.push('-------------------------------------');
    L.push('  Imported as ONE product, so every photograph carries the folder\'s name');
    L.push('  instead of its own. Not split automatically: the split would have to be');
    L.push('  guessed from filenames, and a wrong guess is a wrong specification.');
    L.push('');
    for (const m of plan.mixed) {
      L.push(`  ${m.path}`);
      L.push(`    ${m.subjects.length} products named inside it: ${m.subjects.join(', ')}`);
    }
    L.push('');
  }

  if (plan.looseFolders.length) {
    L.push('CATEGORIES WITH NO PRODUCT FOLDERS');
    L.push('----------------------------------');
    L.push('  Photographs are sitting loose in the category, with no per-item folder to say');
    L.push('  which belong together. A real category imports as ONE umbrella product; see');
    L.push('  SKIPPED, AND WHY below for which. A file with no category at all does not.');
    L.push('');
    for (const { folder, count } of plan.looseFolders.sort((a, b) => b.count - a.count)) {
      L.push(`  ${String(count).padStart(4)}  ${folder}`);
    }
    L.push('');
    L.push('  Fix: inside each, create one folder per product named exactly as the product');
    L.push('  should appear on the site, and move its photographs in, to replace the single');
    L.push('  umbrella listing with one per item.');
    L.push('');
  }

  if (plan.itemFolders.length) {
    L.push('FOLDERS WHERE EACH PHOTOGRAPH IS ITS OWN ITEM');
    L.push('--------------------------------------------');
    L.push('  Every file names an item, so each became a product under that folder as a');
    L.push('  sub range. Prices are entered in the dashboard. Any earlier single product');
    L.push('  holding the whole folder is unpublished.');
    L.push('');
    for (const { folder, items, files } of plan.itemFolders) {
      L.push(`  ${String(items).padStart(4)} item(s) from ${files} file(s)  ${folder}`);
    }
    L.push('');
  }

  if (plan.finishFolders.length) {
    L.push('RANGES SPLIT ONE PRODUCT PER PHOTOGRAPH, SORTED BY FINISH');
    L.push('--------------------------------------------------------');
    L.push('  Phone named photographs, so each became its own product, filed by the finish');
    L.push('  read from the photograph as it imports. Codes, names and prices are set in the');
    L.push('  dashboard; the import never undoes those edits.');
    L.push('');
    for (const { folder, count } of plan.finishFolders) {
      L.push(`  ${String(count).padStart(4)} product(s)  ${folder}`);
    }
    L.push('');
  }

  if (plan.photoFolders.length) {
    L.push('RANGES SPLIT ONE PRODUCT PER PHOTOGRAPH');
    L.push('---------------------------------------');
    L.push('  Phone named photographs, so each became its own product in the range itself.');
    L.push('  Rename each photograph after what it shows, or name it in the dashboard.');
    L.push('  Any earlier single product holding the whole folder is unpublished.');
    L.push('');
    for (const { folder, count } of plan.photoFolders) {
      L.push(`  ${String(count).padStart(4)} product(s)  ${folder}`);
    }
    L.push('');
  }

  if (plan.supplierFolders.length) {
    L.push('SUPPLIER FOLDERS, READ THROUGH');
    L.push('------------------------------');
    L.push('  Named for a supplier, which never appears on the site. A folder of stone');
    L.push('  folders is not a sub range: its products file in the range above it. A folder');
    L.push('  of photographs is one product, named without the supplier.');
    L.push('');
    for (const { folder, into, products } of plan.supplierFolders) {
      L.push(`  ${String(products).padStart(4)} product(s)  ${folder}, filed in ${into}`);
    }
    L.push('');
  }

  if (plan.copies.length) {
    L.push('COPIES OF ONE PHOTOGRAPH, IMPORTED ONCE');
    L.push('---------------------------------------');
    L.push('  The same file uploaded more than once. Each photograph becomes one product,');
    L.push('  in the folder holding fewer photographs.');
    L.push('');
    for (const { folder, keptIn, count } of plan.copies) {
      L.push(`  ${String(count).padStart(4)} copied file(s)  ${folder}, kept in ${keptIn === folder ? 'the same folder' : keptIn}`);
    }
    L.push('');
  }

  if (plan.galleryFiles) {
    L.push(`  ${plan.galleryFiles} gallery and brand file(s) skipped, which is correct.`);
    L.push('  Site photos, site videos and brand identity are not products.');
    L.push('');
  }

  if (plan.productsWithoutSlab.length) {
    L.push('PRODUCTS WITH NO SLAB SHOT');
    L.push('--------------------------');
    L.push('  These will publish without a main image.');
    L.push('');
    for (const p of plan.productsWithoutSlab) L.push(`  ${p}`);
    L.push('');
  }

  if (plan.issues.length) {
    L.push('SKIPPED, AND WHY');
    L.push('----------------');
    L.push('');
    for (const i of plan.issues) L.push(`  ${i.path}\n    ${i.reason}\n`);
  }

  if (!plan.issues.length && !plan.misnests.length) L.push('  Nothing skipped.');
  L.push('');
  return L.join('\n');
};
