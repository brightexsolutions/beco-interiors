/**
 * Misnest detection.
 *
 * The real export had CYPRUS LIGHT GREY and GALAXY BIANCO sitting inside
 * AMBER JADE, byte identical to the top level folders of the same name. Left
 * alone, Amber Jade's gallery would ship with another stone's photographs.
 *
 * Rule: a folder nested inside a PRODUCT folder, one that holds photographs
 * itself, is REPORTED AND SKIPPED, whether or not its name matches a top
 * level sibling. Never imported twice, and never merged into its accidental
 * parent.
 *
 * A folder nested inside a folder that holds only folders is not a misnest:
 * it is a sub range (HEIXIN 12MM under 12MM SINTERED STONES) or an item
 * folder (BLACK HANDLES under HANDLES), and the planner files it. D104.
 */
export interface FolderNode {
  /** Path relative to the category, for example "AMBER JADE/CYPRUS LIGHT GREY". */
  path: string;
  name: string;
  depth: number;
}

export interface Misnest {
  path: string;
  name: string;
  reason: string;
  matchesTopLevel: boolean;
}

export const detectMisnests = (
  folders: readonly FolderNode[],
  /** Whether a category relative folder path holds photographs directly. */
  holdsPhotos: (relativePath: string) => boolean = () => true,
): Misnest[] => {
  const topLevel = new Set(
    folders.filter((f) => f.depth === 1).map((f) => f.name.toUpperCase()),
  );

  const insideProduct = (path: string): boolean => {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      if (holdsPhotos(parts.slice(0, i).join('/'))) return true;
    }
    return false;
  };

  return folders
    .filter((f) => f.depth > 1 && insideProduct(f.path))
    .map((f) => ({
      path: f.path,
      name: f.name,
      matchesTopLevel: topLevel.has(f.name.toUpperCase()),
      reason: topLevel.has(f.name.toUpperCase())
        ? `"${f.name}" already exists at the top level. This copy is nested inside ` +
          `"${f.path.split('/')[0]}" and is skipped, so its photographs do not appear ` +
          `in the wrong product's gallery.`
        : `"${f.name}" is nested inside "${f.path.split('/')[0]}". Product folders ` +
          `must sit directly under their category. Skipped rather than guessed at.`,
    }));
};

/** Paths to exclude from the import, derived from the misnests found. */
export const misnestedPaths = (misnests: readonly Misnest[]): Set<string> =>
  new Set(misnests.map((m) => m.path));
