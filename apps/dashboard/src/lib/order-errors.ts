/**
 * Map a PostgREST / Postgres error into a sentence a salesperson can act on.
 */
export function orderMutationMessage(error: { message?: string; code?: string } | null | undefined): string {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  if (code === 'PT409' || /changed while you were editing/i.test(message)) {
    return 'This order changed while you were editing. Reload and try again.';
  }
  if (code === '42501' || /^Not allowed/i.test(message) || /Not signed in/i.test(message)) {
    return 'You do not have permission to change this order.';
  }
  if (code === 'P0002' || /Order not found|Quote not found/i.test(message)) {
    return 'That record is no longer here.';
  }
  if (/schema cache|could not find the function/i.test(message)) {
    return 'Could not save. Reload the page and try again.';
  }
  if (message) return message;
  return 'The database refused that write.';
}
