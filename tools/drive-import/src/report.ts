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

  if (plan.looseFolders.length) {
    L.push('CATEGORIES WITH NO PRODUCT FOLDERS');
    L.push('----------------------------------');
    L.push('  Photographs are sitting loose in the category. There is nothing to name a');
    L.push('  product after, and no way to tell which photographs belong together.');
    L.push('');
    for (const { folder, count } of plan.looseFolders.sort((a, b) => b.count - a.count)) {
      L.push(`  ${String(count).padStart(4)}  ${folder}`);
    }
    L.push('');
    L.push('  Fix: inside each, create one folder per product named exactly as the product');
    L.push('  should appear on the site, and move its photographs in.');
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
