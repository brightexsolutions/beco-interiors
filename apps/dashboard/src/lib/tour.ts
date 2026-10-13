import type { GuideTopic } from './guide';

/**
 * The screen tour, D149: Next walks the reader from one part of the screen
 * to the next, each lit up with a line on what it is for. A step names a
 * `data-tour` mark rather than a selector, so moving a component keeps its
 * step as long as the mark moves with it. Copy is short: a title of two or
 * three words and one sentence.
 */
export interface TourStep {
  target: string;
  title: string;
  body: string;
}

const SHELL: readonly TourStep[] = [
  { target: 'search', title: 'Search anything', body: 'Jump to a screen or search quotes. Press Command K from anywhere.' },
  { target: 'nav', title: 'Sections', body: 'Grouped by job. Fold a group you rarely use and it stays folded.' },
  { target: 'bottom-nav', title: 'Sections', body: 'Your main screens, with New quote in the middle.' },
  { target: 'guide', title: 'This guide', body: 'Start this tour again here, or read the full written guide.' },
];

const SCREENS: Record<string, readonly TourStep[]> = {
  '/': [
    { target: 'focus', title: 'Waiting on a response', body: 'Quotes past the response target, oldest first. Open queue goes straight to them.' },
    { target: 'month', title: 'This month', body: 'Won, conversion, invoiced and leads against last month. Each tile opens its list.' },
    { target: 'activity', title: 'Week by week', body: 'Quotes raised against won, and where every open quote stands.' },
    { target: 'latest', title: 'Latest quotes', body: 'Newest first, from every salesperson. Open one to work on it.' },
  ],
  '/quotes': [
    { target: 'filters', title: 'Find a quote', body: 'Search by name, phone or reference. The filters narrow it and the count follows.' },
    { target: 'view-switch', title: 'Table or board', body: 'Board lays the quotes out by stage. Drag a card to move it on.' },
    { target: 'results', title: 'The quotes', body: 'Open one to price its lines, issue the PDF and close it.' },
  ],
  '/products': [
    { target: 'ranges', title: 'Browse by range', body: 'Pick a category, then its ranges. The list below follows.' },
    { target: 'filters', title: 'Narrow the list', body: 'Search by name, code or slug, or filter by availability, publishing and stock.' },
    { target: 'view-switch', title: 'List or cards', body: 'List for prices and stock, cards for the photographs.' },
    { target: 'results', title: 'Open a product', body: 'Edit opens the editor: photographs, sizes, price and publishing.' },
    { target: 'actions', title: 'Add a product', body: 'New product starts a draft you fill in and publish.' },
  ],
};

/** The first sentence of a guide topic's purpose, for the heading step. */
const firstSentence = (text: string): string => {
  const end = text.indexOf('. ');
  return end === -1 ? text : text.slice(0, end + 1);
};

/**
 * The steps for a screen: its heading, what is particular to it, then the
 * shell. A screen with no steps of its own still gets its heading, its
 * filters and its results where it has them, then the shell.
 */
export function tourFor(pathname: string, topic: GuideTopic | null): TourStep[] {
  const path = pathname.split('?')[0] || '/';
  const heading: TourStep = {
    target: 'heading',
    title: topic?.title ?? 'This screen',
    body: topic ? firstSentence(topic.purpose) : 'What this screen is for.',
  };
  const own = SCREENS[path] ?? [
    { target: 'filters', title: 'Find what you need', body: 'Search and filter. The count beside them follows.' },
    { target: 'results', title: 'The list', body: 'Open a row to see it in full.' },
  ];
  return [heading, ...own, ...SHELL];
}

/** Is a mark on screen: rendered, with a box, not hidden at this width. */
export function isShown(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/** The first shown element carrying a mark, since desktop and phone may each carry it. */
export function findTarget(target: string, shown: (el: Element) => boolean = isShown): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of all) if (shown(el)) return el;
  return null;
}

/** The steps whose mark is on screen now, with duplicate titles (the two Sections) collapsed. */
export function availableSteps(steps: readonly TourStep[], shown: (el: Element) => boolean = isShown): TourStep[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    if (!findTarget(step.target, shown)) return false;
    if (seen.has(step.title)) return false;
    seen.add(step.title);
    return true;
  });
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type CardPlacement =
  | { side: 'below' | 'above' | 'right' | 'left'; top: number; left: number; width: number }
  | { side: 'docked'; edge: 'top' | 'bottom'; width: number | null };

const MARGIN = 16;
const GAP = 12;
export const TOUR_CARD_WIDTH = 352;

/**
 * Where the card goes beside the lit part: under it, over it, to its right,
 * to its left, in that order, the first that fits whole on screen. A phone,
 * or a part too big for any side, docks the card at the top or bottom edge,
 * whichever is further from the part. The card's width never depends on
 * where it lands, so neither does its height: a docked card on a laptop is
 * as wide as a placed one.
 */
export function placeCard(box: Rect | null, viewport: { width: number; height: number }, cardHeight: number): CardPlacement {
  const phone = viewport.width < 640;
  const width = Math.min(TOUR_CARD_WIDTH, viewport.width - MARGIN * 2);
  const docked = (): CardPlacement => ({
    side: 'docked',
    edge: box && box.top + box.height / 2 > viewport.height / 2 ? 'top' : 'bottom',
    width: phone ? null : width,
  });
  if (!box || phone) return docked();
  const clampLeft = (left: number) => Math.min(Math.max(left, MARGIN), viewport.width - width - MARGIN);
  const clampTop = (top: number) => Math.min(Math.max(top, MARGIN), viewport.height - cardHeight - MARGIN);

  const below = box.top + box.height + GAP;
  if (below + cardHeight <= viewport.height - MARGIN) return { side: 'below', top: below, left: clampLeft(box.left), width };
  const above = box.top - GAP - cardHeight;
  if (above >= MARGIN) return { side: 'above', top: above, left: clampLeft(box.left), width };
  const right = box.left + box.width + GAP;
  if (right + width <= viewport.width - MARGIN) return { side: 'right', top: clampTop(box.top), left: right, width };
  const left = box.left - GAP - width;
  if (left >= MARGIN) return { side: 'left', top: clampTop(box.top), left, width };
  return docked();
}
