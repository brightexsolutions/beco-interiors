/**
 * Supplier names never reach the website, D104 amended 7 October 2026.
 *
 * Beco keep some stones in Drive under the factory they buy from:
 * `12MM SINTERED STONES/HEIXIN 12MM/<stone>` and `12MM SINTERED STONES/DELFONE
 * 12MM`. Irene, 7 October: the supplier is Beco's business, not the
 * customer's, so it must not appear on the site at all, not as a range, a
 * product name, a URL, alt text or an image path.
 *
 * A folder carrying one of these words is read through. A supplier folder
 * of stone folders is not a sub range: its stones file directly in the range
 * above it. A supplier folder of photographs is still a product, since its
 * photographs belong together, but its name loses the supplier word.
 *
 * Matched as a word anywhere in the folder name, case aside, never as an
 * exact folder name, so `HEIXIN 15MM` or `Delfone` is caught the day Beco
 * makes it, without anyone remembering to list it. The words are long and
 * unusual enough that no real product or range name contains one.
 *
 * Add a supplier here when Beco names another; the guard test in
 * `__tests__/supplier.test.ts` then fails on any name, slug, alt text,
 * category or image path the plan would write with it.
 */
export const SUPPLIER_WORDS: readonly string[] = ['HEIXIN', 'DELFONE'];

/** Whether the text carries a supplier word anywhere, in any case. */
export const containsSupplier = (text: string, words: readonly string[] = SUPPLIER_WORDS): boolean => {
  const upper = text.toUpperCase();
  return words.some((word) => upper.includes(word.toUpperCase()));
};

/** A Drive folder named for a supplier, read through rather than shown. */
export const isSupplierFolder = (name: string, words: readonly string[] = SUPPLIER_WORDS): boolean =>
  containsSupplier(name, words);

const escape = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The text with every supplier word taken out, and the spaces, hyphens and
 * commas it leaves behind tidied: "DELFONE 12MM" is "12MM", "heixin-12mm" is
 * "12mm", "Hanting Jade, Heixin 12mm, slab" is "Hanting Jade, 12mm, slab".
 */
export const withoutSupplier = (text: string, words: readonly string[] = SUPPLIER_WORDS): string => {
  if (!words.length) return text;
  const pattern = new RegExp(words.map(escape).join('|'), 'gi');
  return text
    .replace(pattern, ' ')
    .replace(/\s*-\s*-+\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/^[\s,\-_]+|[\s,\-_]+$/g, '');
};

/**
 * Whether what is left names anything once thickness and numbers are set
 * aside. "12MM" does not, so a supplier folder called "DELFONE 12MM" needs a
 * name from its range instead; "STATUARIO" does.
 */
export const namesSomething = (text: string): boolean =>
  /[a-z]{2,}/i.test(text.replace(/\d+(?:\.\d+)?\s*mm\b/gi, ' ').replace(/\d+/g, ' '));
