/**
 * A return path from a form or query string, made safe to redirect to.
 *
 * `startsWith('/')` alone is not enough: `//evil.example/steal` begins with a
 * slash and the browser reads it as a protocol-relative URL to another host,
 * and `/\evil.example` is read the same way by some. Only a path on this
 * origin passes: one leading slash, then anything but a second slash or a
 * backslash, no control characters, and short enough to be a path rather
 * than a payload. Anything else lands on the fallback.
 */
export const safeReturnPath = (value: unknown, fallback = '/'): string => {
  if (typeof value !== 'string') return fallback;
  if (value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
};
