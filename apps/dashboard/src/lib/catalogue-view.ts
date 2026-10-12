/**
 * The catalogue's view, D138: the list (table, rows on a phone) or cards.
 * Read by the server page from `?view=` and by the toolbar switch, so it
 * lives here, in plain code, rather than in the client component.
 */
export type CatalogueView = 'list' | 'cards';

export const parseCatalogueView = (raw: string | undefined): CatalogueView => (raw === 'cards' ? 'cards' : 'list');
