import type { QuoteMoney } from '@beco/validation';

export interface QuotePdfLine {
  description: string;
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
  paymentTerms: string;
  footer: string;
  phone: string;
  issuedAt: string;
  /** Quote is the default. A receipt is the same layout after payment. */
  kind?: 'quote' | 'receipt';
  paidAt?: string | null;
}

export interface QuotePdfTotals extends QuoteMoney {}

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
