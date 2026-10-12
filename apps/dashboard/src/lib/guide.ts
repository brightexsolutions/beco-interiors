import type { UserRole } from '@beco/types';
import { canAccess, type AccessGrants } from './access';

/**
 * The in-app guide, D140: what each screen is for, how to do the common
 * jobs on it, and where the controls are. Written in the words of the
 * person at the counter, in short steps, one screen per topic, so a new
 * member of staff can open it beside the screen they are on and follow it
 * through. Filtered by the same access map as the nav, so nobody is told
 * about a screen they cannot reach.
 */
export interface GuideStep {
  /** One short line: what to do. */
  do: string;
  /** Where, and what happens. */
  where: string;
}

export interface GuideTopic {
  id: string;
  /** The path the topic belongs to, matched by prefix, so the right one opens first. */
  path: string;
  title: string;
  /** What the screen is for, one or two sentences. */
  purpose: string;
  steps: GuideStep[];
  /** Things worth knowing that are not a step. */
  notes?: string[];
}

export const GUIDE_TOPICS: readonly GuideTopic[] = [
  {
    id: 'overview',
    path: '/',
    title: 'Overview',
    purpose: 'The first screen for an admin: what needs someone today, how the month is going, and what just came in.',
    steps: [
      { do: 'Read the charcoal panel first.', where: 'It counts quotes waiting on a reply. A red rule across the top means one has waited past the target. Open queue takes you to them.' },
      { do: 'Tap any figure tile to see the list behind it.', where: 'Won this month opens the won quotes, Owed opens unpaid orders, and so on.' },
      { do: 'Check the two charts for the shape of the month.', where: 'Quotes raised against won, week by week, and where every open quote stands.' },
    ],
  },
  {
    id: 'quotes',
    path: '/quotes',
    title: 'Quotes',
    purpose: 'Every quotation, from a website request to one raised at the counter. The quotation is the product: raise, price and issue it faster than paper.',
    steps: [
      { do: 'Find a quote.', where: 'Search by customer name, phone or reference at the top. The filters narrow by status, source and owner, and the count beside them changes as you do.' },
      { do: 'See them by stage.', where: 'Board beside Table lays the quotes out as columns, New to Lost. Drag a card to the next column; on a phone press and hold it first. Won and Lost ask first.' },
      { do: 'Claim a website request.', where: 'Open it and press Claim. It is assigned to you and moves to Reviewing.' },
      { do: 'Price the lines.', where: 'Change quantity or unit price on each row, then press Save on the Line items heading. Unsaved rows are marked until you do.' },
      { do: 'Add products.', where: 'Add from catalogue opens the published list: search, tick several, Add. A product in several sizes lists one row per size. Custom item is for something not listed.' },
      { do: 'Issue it.', where: 'View shows the PDF as the customer will see it. Download saves it. Email sends it. WhatsApp opens a chat with the PDF attached.' },
      { do: 'Close it.', where: 'Mark won when the customer accepts, which creates the order. Mark lost otherwise; a lost quote can be reopened.' },
    ],
    notes: ['A quote priced away from the catalogue needs an admin to approve it before it is issued.'],
  },
  {
    id: 'new-quote',
    path: '/quotes/new',
    title: 'New quote',
    purpose: 'Raise a quote at the counter or over the phone, on a phone, in under a minute.',
    steps: [
      { do: 'Pick the customer.', where: 'Search by name or number. Add new client if they are not on file; a number already on file offers the existing record.' },
      { do: 'Add the lines.', where: 'Add from catalogue for listed products, Custom item for anything else. Set quantity and price on each row.' },
      { do: 'Save.', where: 'The running total sits in the rail, and on a phone the Save bar stays at the bottom. The quote opens on its own page once saved.' },
    ],
  },
  {
    id: 'orders',
    path: '/orders',
    title: 'Orders',
    purpose: 'A won quote becomes an order here. Track payment and fulfilment, and issue the receipt.',
    steps: [
      { do: 'Find the order.', where: 'Search by reference or customer. Filter by status and payment.' },
      { do: 'Record a payment.', where: 'Open the order and mark it paid, choosing how it was paid. The receipt PDF is ready once it is.' },
      { do: 'Move it along.', where: 'Confirm, then Fulfil when it has been collected or delivered. Only an admin can cancel.' },
    ],
    notes: ['Orders are never created by hand. They come from a won quote, so every order has its quote behind it.'],
  },
  {
    id: 'customers',
    path: '/customers',
    title: 'Customers',
    purpose: 'The client list: who has bought or asked, with every quote and order against them.',
    steps: [
      { do: 'Find someone.', where: 'Search by name, phone in any format, company, email or KRA PIN.' },
      { do: 'Add a client.', where: 'New customer in the heading. A number already on file is caught and the existing record offered.' },
      { do: 'Reach them.', where: 'Call, WhatsApp and Email on the record open the phone, a chat or your mail, prefilled.' },
    ],
  },
  {
    id: 'products',
    path: '/products',
    title: 'Catalogue',
    purpose: 'Every range and product Beco sells, as the website shows them, and the stock behind them.',
    steps: [
      { do: 'Browse by range.', where: 'The rows above the list open one level at a time: a category, then its ranges, then sub ranges. The list below follows.' },
      { do: 'Switch the view.', where: 'List is the table for scanning prices and stock. Cards lead with the photograph, for checking what a product looks like. Both open the same editor.' },
      { do: 'Add a product.', where: 'New product in the heading creates an unpublished draft: name, range, unit and price. The editor opens so you can add photographs.' },
      { do: 'Edit a product.', where: 'Tap a row or a card. Name, photographs, sizes, copy, availability, price and search settings each have their own section. Save at the bottom.' },
      { do: 'Publish it.', where: 'At the top of the editor, beside the Draft pill. Unpublish asks you to confirm. The website updates within a minute.' },
    ],
    notes: ['Stock of 0 reads as Out of stock on the website. Leave stock blank for an uncounted product.'],
  },
  {
    id: 'photos',
    path: '/products?photos',
    title: 'Product photographs',
    purpose: 'Add several photographs at once from a phone or a computer, including iPhone HEIC, and they are made small on the device before they upload.',
    steps: [
      { do: 'Open the product and find Photographs.', where: 'Tap Photographs under Add photographs and pick as many as you like, up to twelve per product and 40MB each.' },
      { do: 'Check each shot.', where: 'Every file gets a Shot (Slab, On stand, Bookmatch, In use) guessed from its name, and alt text from the product name. Change either before you upload.' },
      { do: 'Upload.', where: 'Press Upload. Each file says Preparing, then Uploading with a percentage, then Saving, then Added. A failure stays on its row with the reason and the others carry on.' },
      { do: 'Order them.', where: 'The first photograph is the website card. Up and Down move a stored photograph; Remove photograph asks you to confirm.' },
    ],
    notes: ['An iPhone HEIC that will not read: set Camera, Formats to Most Compatible, or share the photo as a JPEG.'],
  },
  {
    id: 'announcements',
    path: '/announcements',
    title: 'Announcements',
    purpose: 'The bar across the top of the website: a sale, a notice, an event, with its dates.',
    steps: [
      { do: 'Write one.', where: 'New announcement in the heading. One line, a type, and when it starts and ends. The preview shows the bar as the site will.' },
      { do: 'Turn it off early.', where: 'Open it and untick Active. The site updates within a minute.' },
    ],
  },
  {
    id: 'reports',
    path: '/reports',
    title: 'Reports',
    purpose: 'How sales are going: by person, by product and by range, for this month, last month or your own dates.',
    steps: [
      { do: 'Pick the period.', where: 'This month, Last month, or Custom with a start and end date, on the heading row.' },
      { do: 'Read the tabs.', where: 'Sales ranks the team. Products and Categories rank what sold.' },
      { do: 'Take it with you.', where: 'View PDF shows the sales review on screen; Download saves it for the meeting.' },
    ],
  },
  {
    id: 'users',
    path: '/users',
    title: 'Users',
    purpose: 'Who has an account, what their role is, and what extra access they hold.',
    steps: [
      { do: 'Add someone.', where: 'New user in the heading: name, email and role. A password is shown once; send it to them privately, they change it on first sign in.' },
      { do: 'Change what they can see.', where: 'Open the account, then Edit access under Dashboard access. Tick a section to let them see it beyond their role; granted sections are read only.' },
      { do: 'Take an account out of use.', where: 'Deactivate ends their sessions and keeps their quotes attributed to them. Reactivate brings them back.' },
      { do: 'Reset a password.', where: 'Reset password issues a new one, shown once, and they must change it on next sign in.' },
    ],
    notes: ['Brightex accounts are managed by Brightex. A staff manager sees them but cannot change them.'],
  },
  {
    id: 'settings',
    path: '/settings',
    title: 'Settings',
    purpose: 'What goes on every quote and receipt, how customers pay, who gets notified, and who may see what.',
    steps: [
      { do: 'Quotes.', where: 'VAT rate, how long a quote is valid, how fast a website request should be answered, and the footer line.' },
      { do: 'Payments and Business.', where: 'Bank, till, paybill and send money details, the legal name, KRA PIN and address. The preview on the right shows the quote as these change.' },
      { do: 'Permissions.', where: 'Edit access on a person opens the sections they may see beyond their role. Audit and Staff grants stay with Brightex.' },
      { do: 'Save.', where: 'One Save for the whole screen. On a phone it stays at the bottom and says when something is unsaved.' },
    ],
  },
  {
    id: 'audit',
    path: '/audit',
    title: 'Audit',
    purpose: 'Who changed what, and when: every write to a product, quote, order, customer, user or setting.',
    steps: [
      { do: 'Find a change.', where: 'Filter by table, action and person, or search the reference. Open a row for the before and after, side by side.' },
    ],
  },
];

/** The topics this person may read, in order, with the current screen's first. */
export function guideTopicsFor(role: UserRole, grants: AccessGrants, pathname: string): GuideTopic[] {
  const clean = pathname.split('?')[0] ?? pathname;
  const allowed = GUIDE_TOPICS.filter((topic) => canAccess(role, topic.path.split('?')[0] ?? topic.path, grants));
  const current = currentGuideTopic(clean, allowed);
  if (!current) return allowed;
  return [current, ...allowed.filter((topic) => topic.id !== current.id)];
}

/** The topic for a path: the longest matching prefix, so /quotes/new beats /quotes. */
export function currentGuideTopic(pathname: string, topics: readonly GuideTopic[] = GUIDE_TOPICS): GuideTopic | null {
  const clean = pathname.split('?')[0] ?? pathname;
  let match: GuideTopic | null = null;
  for (const topic of topics) {
    const path = topic.path.split('?')[0] ?? topic.path;
    if (path.includes('?')) continue;
    const hit = path === '/' ? clean === '/' : clean === path || clean.startsWith(`${path}/`);
    if (hit && (!match || path.length > (match.path.split('?')[0] ?? '').length)) match = topic;
  }
  return match;
}
