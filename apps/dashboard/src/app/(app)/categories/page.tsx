import { redirect } from 'next/navigation';

/**
 * Ranges used to be their own screen. They are now the filter panel at the
 * top of the catalogue editor, so this path only exists so an old link or
 * bookmark does not 404. Role gating is on `/products`. See D91's reversal
 * in docs/DECISIONS.md.
 */
export default function CategoriesRedirect() {
  redirect('/products');
}
