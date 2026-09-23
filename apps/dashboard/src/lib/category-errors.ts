/**
 * Map a PostgREST or trigger error into a sentence a product manager can act on.
 */
export function categoryMutationMessage(
  error: { message?: string; code?: string } | null | undefined,
): string {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  if (code === '23505' || /duplicate key|categories_slug/i.test(message)) {
    return 'That page URL is already in use. Pick another.';
  }
  if (code === '23514' || /two levels deep|cannot be its own parent|has children/i.test(message)) {
    return 'The taxonomy is only two levels deep. Pick a top level group as the parent, not a range.';
  }
  if (code === '42501') {
    return 'You do not have permission to change this range.';
  }
  if (/schema cache|could not find/i.test(message)) {
    return 'Could not save. Reload the page and try again.';
  }
  if (message) return message;
  return 'The database refused that write.';
}
