/**
 * Detect a product folder that actually holds SEVERAL products.
 *
 * The convention is `CATEGORY/PRODUCT/photographs`, and the pipeline trusts
 * the folder name to be the product name. `12MM SINTERED STONES/DELFONE 12MM`
 * broke that: Delfone is a supplier, and the folder held Bosnia Grey, Bulgaria
 * Black, Calacatta Macchia, Martha Brown, Statuario, Taj Mahal and Verde
 * Lepanto as loose files named after the stone.
 *
 * The result imported cleanly and looked fine. One product called "Delfone
 * 12mm" with nineteen photographs of seven different materials, black, white,
 * green and brown stone in a single gallery, every one captioned with the
 * wrong name. Six real products never reached the catalogue at all, and two of
 * them, Statuario and Taj Mahal, existed separately with their photography
 * sitting in here instead.
 *
 * Nothing errored, so nothing was noticed. That is the class of failure this
 * project keeps finding, which is why the pipeline reports rather than guesses.
 *
 * THE RULE: take the files whose role RESOLVED, strip the role words, the
 * digits and the folder's own words, and see what is left. In a correct folder
 * nothing is left, because the files are called SLAB, APP 1, BOOK MATCH. When
 * more than one distinct subject remains, the folder is naming its contents,
 * which means it holds more than one product.
 *
 * Only role bearing files count. A folder with two unreadable camera filenames
 * would otherwise look like two products, and those are already reported
 * separately as files that do not say what they show.
 *
 * Deliberately NOT split automatically. "TAJ MAHAL POLISHED SLAB" could be a
 * polished slab of Taj Mahal or a product called Taj Mahal Polished, and
 * guessing wrong puts a wrong specification in front of someone who checks.
 */

/** The words that describe the SHOT rather than the material. */
const ROLE_WORDS = new Set([
  'SLAB', 'SLABS', 'ON', 'STAND', 'STONE', 'BOOK', 'MATCH', 'BOOKMATCH', 'APP',
  'APPLICATION', 'POLISHED', 'MATTE', 'FINISH', 'PHOTO', 'IMG', 'COPY', 'FINAL',
]);

const words = (text: string): string[] =>
  text
    .replace(/\.[^.]+$/, '')
    .toUpperCase()
    .replace(/[_\-.()]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * What a filename says it is OF, once the words describing the shot are gone.
 *
 * Returns an empty string for a correctly named file, because "SLAB.jpg" and
 * "APP 1.jpg" are entirely role and carry no subject.
 */
export const subjectOf = (filename: string, folderName: string): string => {
  const folderWords = new Set(words(folderName));
  return words(filename)
    .filter((w) => !ROLE_WORDS.has(w))
    .filter((w) => !/^\d+$/.test(w))
    .filter((w) => !folderWords.has(w))
    .join(' ');
};

export interface MixedFolder {
  /** The folder, as it appears in Drive. */
  path: string;
  /** The distinct subjects found inside it, in the order first seen. */
  subjects: string[];
  reason: string;
}

export interface MixedInput {
  /** Folder path, category relative or root relative. Reported as given. */
  folderPath: string;
  folderName: string;
  /** Filenames whose role resolved. Unknown role files must not be passed. */
  filenames: readonly string[];
}

export const detectMixedFolders = (inputs: readonly MixedInput[]): MixedFolder[] => {
  const mixed: MixedFolder[] = [];

  for (const input of inputs) {
    const subjects: string[] = [];
    for (const filename of input.filenames) {
      const subject = subjectOf(filename, input.folderName);
      if (subject && !subjects.includes(subject)) subjects.push(subject);
    }

    if (subjects.length < 2) continue;

    mixed.push({
      path: input.folderPath,
      subjects,
      reason:
        `"${input.folderName}" looks like it holds ${subjects.length} different products ` +
        `rather than one: ${subjects.join(', ')}. Imported as a SINGLE product, so every ` +
        'photograph in it carries the folder\'s name instead of its own. Give each product ' +
        `its own folder inside "${input.folderName}", named exactly as it should appear on ` +
        'the site, and name the photographs SLAB, SLAB ON STAND, BOOK MATCH and APP 1. ' +
        'Not split automatically, because the split would have to be guessed from filenames.',
    });
  }

  return mixed;
};
