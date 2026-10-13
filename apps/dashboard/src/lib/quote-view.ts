/**
 * The quotes screen's view, D148: the table (rows on a phone) or the board
 * of status columns. Read by the server page from `?view=`.
 */
export type QuoteView = 'table' | 'board';

export const parseQuoteView = (raw: string | undefined): QuoteView => (raw === 'board' ? 'board' : 'table');
