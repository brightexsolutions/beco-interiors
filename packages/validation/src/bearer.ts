/**
 * Constant time check of an `Authorization: Bearer <secret>` header, for the
 * server to server routes (`/api/revalidate`, `/api/ops-alert`).
 *
 * Both sides are hashed first so a length difference cannot short-circuit
 * the comparison, then the digests are compared byte by byte without an
 * early exit. Web Crypto rather than `node:crypto`, so this file can live in
 * the shared package without dragging a Node builtin into a client bundle.
 * An unset secret never matches: a missing env var closes the door rather
 * than opening it.
 */
const digest = async (value: string): Promise<Uint8Array> =>
  new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));

const equalBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
};

export const bearerMatches = async (
  header: string | null | undefined,
  secret: string | undefined,
): Promise<boolean> => {
  if (!secret || !header) return false;
  const [given, expected] = await Promise.all([digest(header), digest(`Bearer ${secret}`)]);
  return equalBytes(given, expected);
};
