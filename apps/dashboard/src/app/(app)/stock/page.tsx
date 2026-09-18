import { redirect } from 'next/navigation';

/**
 * Stock used to be its own section. Quantity now lives on the catalogue
 * editor, so this path only exists so old links and bookmarks do not 404.
 * Role gating is on `/products`.
 */
export default function StockRedirect() {
  redirect('/products');
}
