import type { Category } from './products';

/**
 * Whether a range sells slabs, read from where it sits in the tree.
 *
 * The storefront was written for stone, and its wording assumed it: a hinge
 * photograph labelled "Full slab", a hinge range counted in colours. Nothing
 * on the product row says what kind of thing it is. `unit` reads "per slab"
 * on most stones but is empty on the Heixin sub range, and `face_type` is the
 * same; the importer gives a hardware photograph the `slab` role because it
 * is the item's own shot. The one signal that holds for every stone is the
 * tree: every stone range sits under the Sintered Stone group, at whatever
 * depth, and nothing else does.
 *
 * Matched on the slug, the name and the Drive path of the range and each
 * ancestor, so a renamed group slug alone does not turn the stones into
 * hardware: `12MM SINTERED STONES` still names its own Drive folder.
 */
type Node = Pick<Category, 'slug' | 'name' | 'source_path'>;

const STONE = /sintered[\s-]*stone/i;

export const isStoneRange = (chain: readonly (Node | null | undefined)[]): boolean =>
  chain.some(
    (node) =>
      !!node && (STONE.test(node.slug) || STONE.test(node.name) || STONE.test(node.source_path ?? '')),
  );

/** The line under the product facts when Beco has supplied no specification. */
export const specNote = (stone: boolean): string =>
  stone
    ? 'Full specification, including slab dimensions and finish options, comes with your quote. Ask and we will send it before you commit to anything.'
    : 'Sizes, finishes and fixings come with your quote. Ask and we will confirm them before you commit to anything.';

/**
 * The In stock fact on a range page. A stone range is a set of colours; a
 * hinge range is a set of hinges, which "18 colours" misdescribes.
 */
export const stockCount = (count: number, stone: boolean): string => {
  const noun = stone ? ['colour', 'colours'] : ['item', 'items'];
  return `${count} ${count === 1 ? noun[0] : noun[1]}`;
};
