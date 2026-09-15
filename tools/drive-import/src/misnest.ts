/**
 * Misnest detection.
 *
 * The real export had CYPRUS LIGHT GREY and GALAXY BIANCO sitting inside
 * AMBER JADE, byte identical to the top level folders of the same name. Left
 * alone, Amber Jade's gallery would ship with another stone's photographs.
 *
 * Rule: a folder nested inside a product folder, whose name matches a top
 * level sibling, is REPORTED AND SKIPPED. Never imported twice, and never
 * merged into its accidental parent.
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

export const detectMisnests = (folders: readonly FolderNode[]): Misnest[] => {
  const topLevel = new Set(
    folders.filter((f) => f.depth === 1).map((f) => f.name.toUpperCase()),
  );

  return folders
    .filter((f) => f.depth > 1)
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
