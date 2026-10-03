import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Constant time check of an `Authorization: Bearer <secret>` header. Both
 * sides are hashed first so a length difference cannot short-circuit the
 * comparison. An unset secret never matches, so a missing env var closes the
 * door rather than opening it.
 */
export const bearerMatches = (header: string | null, secret: string | undefined): boolean => {
  if (!secret || !header) return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
};
