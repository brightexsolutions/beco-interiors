/**
 * Whether a storage path is one this app wrote for this reference:
 * `quotes/<reference>/<uuid>.pdf` or `receipts/<reference>/<uuid>.pdf`.
 * Exact shape, no traversal, so a caller cannot point a "mark as sent" at
 * another quote's document.
 */
export const isDocumentPathFor = (kind: 'quotes' | 'receipts', reference: string, path: string): boolean => {
  const escaped = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${kind}/${escaped}/[0-9a-f-]{36}\\.pdf$`, 'i').test(path);
};
