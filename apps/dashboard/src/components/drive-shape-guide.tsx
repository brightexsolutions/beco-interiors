import { Panel } from '@beco/ui';

const SHAPES: Array<{ shape: string; result: string; example: string }> = [
  {
    shape: 'RANGE / PRODUCT / photographs',
    result: 'A range and its products. Name the photographs SLAB, SLAB ON STAND, BOOK MATCH, APP 1.',
    example: '12MM SINTERED STONES / AMBER JADE / SLAB.jpg',
  },
  {
    shape: 'RANGE / SUB RANGE / PRODUCT / photographs',
    result: 'A sub range under the range, with its own products.',
    example: '12MM SINTERED STONES / HEIXIN 12MM / INK WHITE / SLAB.jpg',
  },
  {
    shape: 'RANGE / SUB RANGE / one photograph per item',
    result: 'Each photograph named for the item becomes its own product. A second photo of the same item ends in 2.',
    example: 'HANDLES / BLACK HANDLES / HT-8350 BLACK GOLD.heic',
  },
  {
    shape: 'RANGE / photographs from a phone',
    result: 'One product named after the range, every photo in it. Make folders, or name the files, to split it.',
    example: '15MM SINTERED STONES / IMG_4197.heic',
  },
];

/**
 * The folder shapes the importer understands, in the words of the person
 * arranging Drive. On the screen rather than in a document, because the
 * person who needs it is the one looking at a skipped folder in the report
 * above and deciding what to rename.
 */
export function DriveShapeGuide() {
  return (
    <Panel
      title={
        <div>
          <h2 className="font-ui text-base font-semibold text-charcoal">How Drive is read</h2>
          <p className="mt-0.5 font-ui text-sm text-neutral-500">
            A folder with photographs in it is a product. A folder of folders is a range. Three levels is the most the site shows.
          </p>
        </div>
      }
    >
      <ul className="divide-y divide-neutral-200">
        {SHAPES.map((row) => (
          <li key={row.shape} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6 sm:px-5">
            <div>
              <p className="font-mono text-sm text-charcoal">{row.shape}</p>
              <p className="mt-1 font-mono text-sm text-neutral-500">{row.example}</p>
            </div>
            <p className="font-ui text-base text-neutral-700">{row.result}</p>
          </li>
        ))}
        <li className="px-4 py-3 font-ui text-sm text-neutral-500 sm:px-5">
          Price lists and spreadsheets are noted and left alone: prices, codes and names are set on each product in the catalogue. Lighting folders are skipped.
        </li>
      </ul>
    </Panel>
  );
}
