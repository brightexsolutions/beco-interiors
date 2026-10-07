/**
 * Map a PostgREST / Postgres error into a sentence a salesperson can act on.
 * The lock collision is the one that must stay specific, or they will retry
 * and overwrite a colleague.
 */
export function mutationMessage(error: { message?: string; code?: string } | null | undefined): string {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  if (code === 'PT409' || /changed while you were editing/i.test(message)) {
    return 'This quote changed while you were editing. Reload and try again.';
  }
  if (code === '23514' || /finalized_requires_approval/i.test(message)) {
    return 'This quote needs approval before it can be marked quoted, won or lost.';
  }
  if (code === '42501' || /^Not allowed/i.test(message) || /Not signed in/i.test(message)) {
    return 'You do not have permission to change this quote.';
  }
  if (/customer is no longer on file/i.test(message)) {
    return 'That customer is no longer on file. Pick another.';
  }
  if (/Line not found/i.test(message)) {
    return 'That item is no longer on this quote. Reload to see the current list.';
  }
  if (code === 'P0002' || /Quote not found/i.test(message)) {
    return 'That quote is no longer here.';
  }
  if (/schema cache|could not find the function/i.test(message)) {
    return 'Could not save. Reload the page and try again.';
  }
  if (message) return message;
  return 'The database refused that write.';
}
