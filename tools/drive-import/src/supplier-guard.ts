import type { ImportPlan } from './plan';
import { imageAlt, imageKeyBase } from './run';
import { containsSupplier, SUPPLIER_WORDS } from './supplier';

export interface SupplierLeak {
  /** The Drive file the leak would be written for. */
  path: string;
  field: 'product name' | 'product slug' | 'category name' | 'category slug' | 'category path' | 'alt text' | 'image key';
  value: string;
}

/**
 * Every string the importer would write that a visitor can see, or that
 * reaches a URL, checked for a supplier word, D104 amended 7 October: product
 * names and slugs, every category in the chain, the alt text and the R2 key
 * of each photograph. The product's Drive path is not checked: it is
 * provenance, read by the import and the dashboard, never rendered on the
 * site.
 *
 * Empty means the plan is clean. The dry run prints the result, and the
 * guard test runs it against every folder shape a supplier folder can take.
 */
export const supplierLeaks = (plan: Pick<ImportPlan, 'files'>, words: readonly string[] = SUPPLIER_WORDS): SupplierLeak[] => {
  const leaks: SupplierLeak[] = [];
  const check = (path: string, field: SupplierLeak['field'], value: string) => {
    if (containsSupplier(value, words)) leaks.push({ path, field, value });
  };
  plan.files.forEach((file) => {
    check(file.path, 'product name', file.productName);
    check(file.path, 'product slug', file.productSlug);
    check(file.path, 'category slug', file.categorySlug);
    check(file.path, 'category path', file.categoryPath);
    for (const node of file.categoryChain) {
      check(file.path, 'category name', node.name);
      check(file.path, 'category slug', node.slug);
      check(file.path, 'category path', node.path);
    }
    check(file.path, 'alt text', imageAlt(file.productSlug, file.categorySlug, file.role));
    // The highest index a photograph can take is the size of its product's
    // gallery, but the index is a number and never carries a word, so 0
    // stands for all of them.
    check(file.path, 'image key', imageKeyBase(file.categorySlug, file.productSlug, file.role, 0));
  });
  return leaks;
};
