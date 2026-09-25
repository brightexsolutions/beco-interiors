import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { logoPath } from './fonts';
import type { ReportPdfFunnelRow, ReportPdfInput, ReportPdfPerson } from './types';

/**
 * Two documents, not one with a filter. Overall is the team performance
 * report: summary, salesperson table, catalogue, ranges. A salesperson
 * review is a memo for one person: their quotes and their orders.
 */

const CHARCOAL = '#101820';
const WARM_RED = '#c81419';
const MUTED = '#6b757f';
const RULE = '#d7dce0';

export const kes = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export const rate = (value: number | null) => (value == null ? 'n/a' : `${value}%`);

export function summaryCopy(report: ReportPdfInput): string {
  if (report.person) return personCopy(report);
  if (report.raised === 0) {
    return `No quotes were raised overall in ${report.period.toLowerCase()}. Invoiced ${kes(report.invoiced)}. Collected ${kes(report.collected)}.`;
  }
  return `In ${report.period.toLowerCase()} the team raised ${report.raised} quotes and won ${report.won}, a conversion of ${rate(report.conversion)}. Invoiced ${kes(report.invoiced)}. Collected ${kes(report.collected)}.`;
}

export function personCopy(report: ReportPdfInput): string {
  const name = report.person ?? 'This salesperson';
  const row = report.people[0];
  if (report.raised === 0) {
    return `${name} raised no quotes in ${report.period.toLowerCase()}. Invoiced ${kes(report.invoiced)}. Collected ${kes(report.collected)}.`;
  }
  const lost = row?.lost ?? 0;
  const lostBit = lost === 0 ? 'None were lost.' : `${lost} ${lost === 1 ? 'was' : 'were'} lost.`;
  return `${name} raised ${report.raised} quotes in ${report.period.toLowerCase()} and won ${report.won} (${kes(row?.wonValue ?? 0)}). ${lostBit} Invoiced ${kes(report.invoiced)}. Collected ${kes(report.collected)}.`;
}

export function catalogueCopy(report: ReportPdfInput): string {
  if (report.products.length === 0) {
    return 'The storefront recorded no product events in this period.';
  }
  const top = [...report.products].sort((a, b) => b.views - a.views)[0]!;
  return `${top.name} led catalogue interest with ${top.views} views, ${top.addToCart} added to cart, and ${top.quoted} quotes submitted.`;
}

export function categoryCopy(report: ReportPdfInput): string {
  if (report.categories.length === 0) {
    return 'Nothing to group by range in this period.';
  }
  const top = [...report.categories].sort((a, b) => b.views - a.views)[0]!;
  return `${top.name} was the most viewed range, with ${top.views} views.`;
}

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
  personName: { fontFamily: 'Cormorant', fontSize: 22, fontWeight: 500, color: CHARCOAL },
  eyebrow: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: WARM_RED,
    marginBottom: 2,
  },
  period: { fontSize: 12, fontWeight: 600, textAlign: 'right' },
  issued: { fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 2 },
  intro: { fontSize: 10, lineHeight: 1.5, marginBottom: 16, maxWidth: 420 },
  section: { marginBottom: 18 },
  sectionTitle: { fontFamily: 'Cormorant', fontSize: 14, fontWeight: 500, marginBottom: 8 },
  body: { fontSize: 10, lineHeight: 1.5 },
  totals: { marginBottom: 12, width: 260 },
  columns: { flexDirection: 'row', gap: 28, marginBottom: 16 },
  column: { width: 240 },
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
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: CHARCOAL,
    paddingBottom: 6,
    marginBottom: 4,
    marginTop: 10,
  },
  th: { fontSize: 8, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: MUTED },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  name: { flex: 3, paddingRight: 8 },
  num: { flex: 1, textAlign: 'right' },
  wide: { flex: 1.4, textAlign: 'right' },
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

function Line({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function OverallTotals({ report }: { report: ReportPdfInput }) {
  return (
    <View style={styles.totals} wrap={false}>
      <Line label="Invoiced" value={kes(report.invoiced)} />
      <Line label="Collected" value={kes(report.collected)} />
      <Line label="Quotes raised" value={report.raised} />
      <Line label="Quotes won" value={report.won} />
      <View style={styles.grand}>
        <Text style={styles.grandLabel}>Conversion</Text>
        <Text style={styles.grandLabel}>{rate(report.conversion)}</Text>
      </View>
    </View>
  );
}

function PersonActivity({ report, row }: { report: ReportPdfInput; row: ReportPdfPerson | undefined }) {
  return (
    <View style={styles.columns} wrap={false}>
      <View style={styles.column}>
        <Text style={styles.sectionTitle}>Quotes</Text>
        <Line label="Raised" value={report.raised} />
        <Line label="Won" value={report.won} />
        <Line label="Lost" value={row?.lost ?? 0} />
        <Line label="Won value" value={kes(row?.wonValue ?? 0)} />
        <View style={styles.grand}>
          <Text style={styles.grandLabel}>Conversion</Text>
          <Text style={styles.grandLabel}>{rate(report.conversion)}</Text>
        </View>
      </View>
      <View style={styles.column}>
        <Text style={styles.sectionTitle}>Orders</Text>
        <Line label="Placed" value={row?.orders ?? 0} />
        <Line label="Invoiced" value={kes(report.invoiced)} />
        <View style={styles.grand}>
          <Text style={styles.grandLabel}>Collected</Text>
          <Text style={styles.grandLabel}>{kes(report.collected)}</Text>
        </View>
      </View>
    </View>
  );
}

function PeopleTable({ people }: { people: ReportPdfPerson[] }) {
  return (
    <View>
      <View style={styles.tableHeader} wrap={false}>
        <Text style={[styles.th, styles.name]}>Salesperson</Text>
        <Text style={[styles.th, styles.num]}>Raised</Text>
        <Text style={[styles.th, styles.num]}>Won</Text>
        <Text style={[styles.th, styles.wide]}>Won value</Text>
        <Text style={[styles.th, styles.wide]}>Conversion</Text>
      </View>
      {people.map((person) => (
        <View key={person.name} style={styles.row} wrap={false}>
          <Text style={[styles.body, styles.name]}>{person.name}</Text>
          <Text style={[styles.body, styles.num]}>{person.raised}</Text>
          <Text style={[styles.body, styles.num]}>{person.won}</Text>
          <Text style={[styles.body, styles.wide]}>{kes(person.wonValue)}</Text>
          <Text style={[styles.body, styles.wide]}>{rate(person.conversion)}</Text>
        </View>
      ))}
    </View>
  );
}

function FunnelTable({ rows }: { rows: ReportPdfFunnelRow[] }) {
  return (
    <View>
      <View style={styles.tableHeader} wrap={false}>
        <Text style={[styles.th, styles.name]}>Name</Text>
        <Text style={[styles.th, styles.num]}>Views</Text>
        <Text style={[styles.th, styles.num]}>Cart</Text>
        <Text style={[styles.th, styles.num]}>Quoted</Text>
        <Text style={[styles.th, styles.num]}>WhatsApp</Text>
        <Text style={[styles.th, styles.num]}>Calls</Text>
        <Text style={[styles.th, styles.wide]}>View to cart</Text>
      </View>
      {rows.map((row) => (
        <View key={row.name} style={styles.row} wrap={false}>
          <Text style={[styles.body, styles.name]}>{row.name}</Text>
          <Text style={[styles.body, styles.num]}>{row.views}</Text>
          <Text style={[styles.body, styles.num]}>{row.addToCart}</Text>
          <Text style={[styles.body, styles.num]}>{row.quoted}</Text>
          <Text style={[styles.body, styles.num]}>{row.whatsapp}</Text>
          <Text style={[styles.body, styles.num]}>{row.calls}</Text>
          <Text style={[styles.body, styles.wide]}>{rate(row.viewToCart)}</Text>
        </View>
      ))}
    </View>
  );
}

function Chrome({
  report,
  kind,
  heading,
}: {
  report: ReportPdfInput;
  kind: string;
  heading: string;
}) {
  const generated = nairobiDay(report.generatedAt);
  return (
    <View style={styles.header} fixed>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Image src={logoPath} style={styles.logo} />
        <View>
          <Text style={styles.eyebrow}>Beco Interiors Limited</Text>
          <Text style={kind === 'person' ? styles.personName : styles.brand}>{heading}</Text>
        </View>
      </View>
      <View>
        <Text style={styles.period}>{kind === 'person' ? 'Salesperson review' : report.period}</Text>
        <Text style={styles.issued}>{kind === 'person' ? report.period : `Prepared ${generated}`}</Text>
        {kind === 'person' ? <Text style={styles.issued}>Prepared {generated}</Text> : null}
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Beco Interiors Limited. Internal use.</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function OverallReview({ report }: { report: ReportPdfInput }) {
  return (
    <Document
      title={`Overall sales review, ${report.period}`}
      author="Beco Interiors Limited"
      subject={summaryCopy(report)}
    >
      <Page size="A4" style={styles.page} wrap>
        <Chrome report={report} kind="overall" heading="Overall sales review" />
        <Text style={styles.intro}>
          Internal overall sales review for the Nairobi calendar month. Not a customer document.
          Dates and totals use Africa/Nairobi.
        </Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <OverallTotals report={report} />
          <Text style={styles.body}>{summaryCopy(report)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salesperson results</Text>
          {report.people.length === 0 ? (
            <Text style={styles.body}>No salesperson figures in this period.</Text>
          ) : (
            <PeopleTable people={report.people} />
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catalogue interest</Text>
          <Text style={styles.body}>{catalogueCopy(report)}</Text>
          {report.products.length > 0 ? <FunnelTable rows={report.products} /> : null}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Range interest</Text>
          <Text style={styles.body}>{categoryCopy(report)}</Text>
          {report.categories.length > 0 ? <FunnelTable rows={report.categories} /> : null}
        </View>
        <Footer />
      </Page>
    </Document>
  );
}

function PersonReview({ report }: { report: ReportPdfInput }) {
  const row = report.people[0];
  return (
    <Document
      title={`Salesperson review, ${report.person}, ${report.period}`}
      author="Beco Interiors Limited"
      subject={personCopy(report)}
    >
      <Page size="A4" style={styles.page} wrap>
        <Chrome report={report} kind="person" heading={report.person ?? 'Salesperson'} />
        <Text style={styles.intro}>
          One salesperson. Not the overall sales review. Nairobi calendar month. Dates and totals
          use Africa/Nairobi.
        </Text>
        <PersonActivity report={report} row={row} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record</Text>
          <Text style={styles.body}>{personCopy(report)}</Text>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}

export function ReportDocument({ report }: { report: ReportPdfInput }) {
  return report.person ? <PersonReview report={report} /> : <OverallReview report={report} />;
}
