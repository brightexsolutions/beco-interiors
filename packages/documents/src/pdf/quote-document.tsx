import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { quoteTotals } from '@beco/validation';
import { logoPath } from './fonts';
import type { QuotePdfInput } from './types';

/**
 * One template for a counter quote and a web quote. Line prices come from
 * the stored unit_price, never live from products. Unpriced quotes replace
 * the totals block with "Pricing on application" rather than printing zeros.
 */

const CHARCOAL = '#101820';
const WARM_RED = '#c81419';
const MUTED = '#6b757f';
const RULE = '#d7dce0';

const kes = (n: number) =>
  `KES ${new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Titillium',
    fontSize: 10,
    color: CHARCOAL,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  logo: { width: 36, height: 36 },
  brand: { fontFamily: 'Cormorant', fontSize: 18, fontWeight: 500, color: CHARCOAL },
  eyebrow: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: WARM_RED,
    marginBottom: 2,
  },
  reference: { fontSize: 12, fontWeight: 600, textAlign: 'right' },
  issued: { fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 2 },
  columns: { flexDirection: 'row', gap: 24, marginBottom: 20 },
  col: { flex: 1 },
  label: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: MUTED,
    marginBottom: 4,
  },
  body: { fontSize: 10, lineHeight: 1.5 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: CHARCOAL,
    paddingBottom: 6,
    marginBottom: 4,
  },
  th: { fontSize: 8, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: MUTED },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  desc: { flex: 5, paddingRight: 8 },
  qty: { flex: 1, textAlign: 'right' },
  unit: { flex: 2, textAlign: 'right' },
  total: { flex: 2, textAlign: 'right' },
  totals: { marginTop: 16, alignSelf: 'flex-end', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { color: MUTED },
  grand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: CHARCOAL,
    paddingTop: 6,
    marginTop: 4,
  },
  grandLabel: { fontWeight: 600, fontSize: 11 },
  poa: { marginTop: 16, fontFamily: 'Cormorant', fontSize: 14, textAlign: 'right' },
  terms: { marginTop: 28, paddingTop: 12, borderTopWidth: 1, borderTopColor: RULE },
  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 24,
    fontSize: 8,
    color: MUTED,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const nairobiDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  });

export function QuoteDocument({ quote }: { quote: QuotePdfInput }) {
  const totals = quoteTotals(
    quote.lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
    quote.vatRate,
  );
  const issued = nairobiDay(quote.issuedAt);
  const paid = quote.paidAt ? nairobiDay(quote.paidAt) : null;
  const vatPercent = Math.round(quote.vatRate * 100);
  const isReceipt = quote.kind === 'receipt';

  return (
    <Document
      title={`${quote.reference} ${isReceipt ? 'Receipt' : 'Beco Interiors'}`}
      author="Beco Interiors Limited"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Image src={logoPath} style={styles.logo} />
            <View>
              <Text style={styles.eyebrow}>Beco Interiors</Text>
              <Text style={styles.brand}>{isReceipt ? 'Receipt' : 'Quotation'}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.reference}>{quote.reference}</Text>
            <Text style={styles.issued}>{isReceipt ? 'Raised' : 'Issued'} {issued}</Text>
            {isReceipt && paid ? <Text style={styles.issued}>Paid {paid}</Text> : null}
            {!isReceipt && quote.validUntil ? (
              <Text style={styles.issued}>Valid until {quote.validUntil}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.col}>
            <Text style={styles.label}>Prepared for</Text>
            <Text style={styles.body}>{quote.customerName}</Text>
            <Text style={styles.body}>{quote.customerPhone}</Text>
            {quote.customerEmail ? <Text style={styles.body}>{quote.customerEmail}</Text> : null}
            {quote.company ? <Text style={styles.body}>{quote.company}</Text> : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.body}>Beco Interiors Limited</Text>
            <Text style={styles.body}>Urban Square, Shop 8 and 9</Text>
            <Text style={styles.body}>Enterprise Road, Industrial Area, Nairobi</Text>
            <Text style={styles.body}>{quote.phone}</Text>
          </View>
        </View>

        {quote.projectDetails ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Project</Text>
            <Text style={styles.body}>{quote.projectDetails}</Text>
          </View>
        ) : null}

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.desc]}>Item</Text>
          <Text style={[styles.th, styles.qty]}>Qty</Text>
          <Text style={[styles.th, styles.unit]}>Unit</Text>
          <Text style={[styles.th, styles.total]}>Line</Text>
        </View>

        {quote.lines.map((line, index) => (
          <View key={`${line.description}-${index}`} style={styles.row} wrap={false}>
            <Text style={[styles.body, styles.desc]}>{line.description}</Text>
            <Text style={[styles.body, styles.qty]}>{line.quantity}</Text>
            <Text style={[styles.body, styles.unit]}>
              {line.unitPrice > 0 ? kes(line.unitPrice) : 'POA'}
            </Text>
            <Text style={[styles.body, styles.total]}>
              {line.unitPrice > 0 ? kes(line.lineTotal) : 'POA'}
            </Text>
          </View>
        ))}

        {totals.isPriced ? (
          <View style={styles.totals} wrap={false}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text>{kes(totals.net)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT {vatPercent}% (included)</Text>
              <Text>{kes(totals.vat)}</Text>
            </View>
            <View style={styles.grand}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandLabel}>{kes(totals.gross)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.poa}>Pricing on application</Text>
        )}

        <View style={styles.terms} wrap={false}>
          {isReceipt ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Payment</Text>
              <Text style={styles.body}>Paid in full. Thank you.</Text>
            </View>
          ) : null}
          {!isReceipt && quote.paymentTerms ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Terms</Text>
              <Text style={styles.body}>{quote.paymentTerms}</Text>
            </View>
          ) : null}
          {!isReceipt && quote.bankDetails ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Bank</Text>
              <Text style={styles.body}>{quote.bankDetails}</Text>
            </View>
          ) : null}
          {!isReceipt && quote.tillNumber ? (
            <View>
              <Text style={styles.label}>Till</Text>
              <Text style={styles.body}>{quote.tillNumber}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text>{quote.footer}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
