/**
 * Slugs derive from Drive folder names, so the taxonomy stays traceable to
 * its source and a category URL can be checked against the folder it came
 * from.
 *
 * Must match the seed exactly, or the pipeline creates duplicates of products
 * that already exist. A test asserts that against the real 24 folder names.
 */
export const slugify = (folderName: string): string =>
  folderName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')     // strip accents
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '-')          // any run of non alphanumerics
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

/**
 * "HT-8350 GOLD BLACK" becomes "HT-8350 Gold Black". An item named after its
 * code keeps the code as written: a token carrying a digit, or one or two
 * capitals on their own ("HT", "B"), is a code and not a word.
 */
export const titleiseItem = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/\d/.test(w) || /^[A-Z]{1,2}$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');

/** "AMBER JADE" becomes "Amber Jade". Drive folders are shouted; pages are not. */
export const titleise = (folderName: string): string =>
  folderName
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
