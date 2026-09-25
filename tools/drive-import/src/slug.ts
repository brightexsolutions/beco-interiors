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

/** "AMBER JADE" becomes "Amber Jade". Drive folders are shouted; pages are not. */
export const titleise = (folderName: string): string =>
  folderName
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
