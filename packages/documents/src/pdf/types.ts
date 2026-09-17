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
}

export interface QuotePdfTotals extends QuoteMoney {}
