import type { QuoteMoney } from '@beco/validation';

export interface QuotePdfLine {
  description: string;
  /** The product code, printed under the description, D124. */
  code?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface QuotePdfInput {
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  company?: string | null;
  projectDetails?: string | null;
  validUntil: string | null;
  lines: QuotePdfLine[];
  vatRate: number;
  bankDetails: string;
  tillNumber: string;
  paybillNumber: string;
  paybillAccount: string;
  sendMoneyNumber: string;
  paymentTerms: string;
  footer: string;
  phone: string;
  issuedAt: string;
  /** The From block. Optional so an older caller still renders the
   *  defaults; KRA lines print only once they are filled in. */
  business?: {
    legalName?: string;
    kraPin?: string;
    vatNumber?: string;
    address?: string;
    email?: string;
  };
  /** Quote is the default. A receipt is the same layout after payment. */
  kind?: 'quote' | 'receipt';
  paidAt?: string | null;
}

export interface QuotePdfTotals extends QuoteMoney {}

/**
 * How a line's product code is printed, on the PDF and in the email alike,
 * D124: "Code H-301". Null when there is no code to print.
 */
export const lineCodeLabel = (code?: string | null): string | null => {
  const trimmed = code?.trim();
  return trimmed ? `Code ${trimmed}` : null;
};

const DEFAULT_ADDRESS = 'Urban Square, Shop 8 and 9, Enterprise Road, Industrial Area, Nairobi';

/** The lines of the From block, in print order, blanks dropped. */
export function quoteFromLines(quote: QuotePdfInput): { name: string; lines: string[]; tax: string[] } {
  const b = quote.business ?? {};
  const address = (b.address?.trim() || DEFAULT_ADDRESS)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lines = [...address, quote.phone, b.email?.trim() ?? ''].filter(Boolean);
  const tax: string[] = [];
  const pin = b.kraPin?.trim() ?? '';
  const vat = b.vatNumber?.trim() ?? '';
  if (pin) tax.push(`KRA PIN ${pin}`);
  if (vat && vat !== pin) tax.push(`VAT No. ${vat}`);
  return { name: b.legalName?.trim() || 'Beco Interiors Limited', lines, tax };
}

export function quotePaymentBlocks(quote: QuotePdfInput): { label: string; lines: string[] }[] {
  const blocks: { label: string; lines: string[] }[] = [];
  if (quote.bankDetails) blocks.push({ label: 'Bank', lines: [quote.bankDetails] });
  if (quote.tillNumber) blocks.push({ label: 'Till', lines: [quote.tillNumber] });
  if (quote.paybillNumber) {
    const lines = [quote.paybillNumber];
    if (quote.paybillAccount) lines.push(`Account ${quote.paybillAccount}`);
    blocks.push({ label: 'Paybill', lines });
  }
  if (quote.sendMoneyNumber) blocks.push({ label: 'Send money', lines: [quote.sendMoneyNumber] });
  return blocks;
}

export interface ReportPdfPerson {
  name: string;
  raised: number;
  won: number;
  lost: number;
  wonValue: number;
  conversion: number | null;
  orders: number;
}

export interface ReportPdfFunnelRow {
  name: string;
  views: number;
  addToCart: number;
  quoted: number;
  whatsapp: number;
  calls: number;
  viewToCart: number | null;
}

export interface ReportPdfInput {
  period: string;
  generatedAt: string;
  /** Set for a one-person review. Empty is the team document. */
  person: string | null;
  invoiced: number;
  collected: number;
  raised: number;
  won: number;
  conversion: number | null;
  people: ReportPdfPerson[];
  products: ReportPdfFunnelRow[];
  categories: ReportPdfFunnelRow[];
}
