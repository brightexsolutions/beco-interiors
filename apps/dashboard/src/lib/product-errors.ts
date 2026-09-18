/**
 * Map a PostgREST error into a sentence a product manager can act on.
 */
export function productMutationMessage(
  error: { message?: string; code?: string } | null | undefined,
): string {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  if (code === '23505' || /duplicate key|products_slug/i.test(message)) {
    return 'That slug is already in use. Pick another.';
  }
  if (code === '23514' || /products_price_matches_mode|products_stock/i.test(message)) {
    return 'Check the price and the stock count, then try again.';
  }
  if (code === '42501') {
    return 'You do not have permission to change this product.';
  }
  if (/schema cache|could not find/i.test(message)) {
    return 'Could not save. Reload the page and try again.';
  }
  if (message) return message;
  return 'The database refused that write.';
}
